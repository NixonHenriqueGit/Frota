/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import {
  ChecklistKey,
  DashboardFilters,
  DocumentStatus,
  LegalizedDocumentRecord,
  NavSection,
  Vehicle,
  VehicleDocumentRecord,
  VehicleEvidenceRecord,
  VehicleStatus,
} from './types/fleet';
import {
  CHECKLIST_ITEMS,
  INITIAL_DOCUMENTS,
  INITIAL_EVIDENCES,
  INITIAL_VEHICLES,
  resolveVehiclePhoto,
} from './data/fleetSeed';
import {
  clearAllVehiclePhotosFromDb,
  loadAllVehiclePhotosFromDb,
  saveVehiclePhotoToDb,
} from './utils/photoStorage';
import {
  deleteLegalizedFileFromDb,
  loadAllLegalizedFilesFromDb,
  saveLegalizedFileToDb,
} from './utils/legalizedFileStorage';
import {
  buildDocumentsForVehicle,
  buildEvidenceForVehicle,
  normalizeCategory,
  sanitizeFirestoreId,
} from './utils/fleetSpreadsheet';
import {
  OperationType,
  SHARED_WORKSPACE_ID,
  db,
  handleFirestoreError,
} from './firebase';
import {
  DocumentFirestoreDoc,
  EvidenceFirestoreDoc,
  LegalizedDocFirestoreDoc,
  VehicleFirestoreDoc,
  addDocumentInFirestore,
  addLegalizedDocInFirestore,
  buildCollectionQuery,
  clearAllFleetInFirestore,
  deleteLegalizedDocInFirestore,
  deleteVehicleBundle,
  importFleetToFirestore,
  loadDefaultFleetToFirestore,
  mapDocToLegalizedDoc,
  mapDocToVehicle,
  mapDocToVehicleDocument,
  mapDocToVehicleEvidence,
  saveVehicleBundle,
  saveVehiclePhotoInFirestore,
  syncLocalFleetSnapshotToFirestore,
  toggleEvidenceFieldInFirestore,
  toggleVehicleStatusInFirestore,
  updateDocumentInFirestore,
  updateLegalizedDocInFirestore,
  updateVehicleChecklistInFirestore,
  upsertFleetMeta,
} from './services/fleetFirestore';
import { Sidebar } from './components/Sidebar';
import { HeaderBar } from './components/HeaderBar';
import { OverviewView } from './components/OverviewView';
import { FleetRegistryView } from './components/FleetRegistryView';
import { DocumentsView } from './components/DocumentsView';
import { EvidencesView } from './components/EvidencesView';
import { ChecklistsView } from './components/ChecklistsView';
import { LegalizedDocumentsView } from './components/LegalizedDocumentsView';
import { ProcessGuaranteeView } from './components/ProcessGuaranteeView';
import { VehicleModal } from './components/VehicleModal';
import { ImportFleetModal } from './components/ImportFleetModal';

const STORAGE_KEY = 'pau_brasil_frota_v2';
const LEGALIZED_STORAGE_KEY = 'pau_brasil_legalized_docs_v1';

interface LocalSnapshot {
  vehicles: Vehicle[];
  documents: VehicleDocumentRecord[];
  evidences: VehicleEvidenceRecord[];
  lastUpdated?: string;
}

function nowTimestamp(): string {
  const d = new Date();
  const datePart = d.toLocaleDateString('pt-BR');
  const timePart = d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${datePart} ${timePart}`;
}

function readLocalSnapshot(): LocalSnapshot | null {
  try {
    localStorage.removeItem('pau_brasil_frota_v1');
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalSnapshot;
    if (
      Array.isArray(parsed.vehicles) &&
      Array.isArray(parsed.documents) &&
      Array.isArray(parsed.evidences)
    ) {
      return parsed;
    }
  } catch {
    // Ignore local storage errors
  }
  return null;
}

function writeLocalSnapshot(
  vehicles: Vehicle[],
  documents: VehicleDocumentRecord[],
  evidences: VehicleEvidenceRecord[],
  lastUpdated: string
): void {
  try {
    const compactVehicles = vehicles.map((v) => ({
      ...v,
      photoUrl: v.photoUrl.startsWith('data:')
        ? resolveVehiclePhoto(v.plate, v.category)
        : v.photoUrl,
    }));
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        vehicles: compactVehicles,
        documents,
        evidences,
        lastUpdated,
      })
    );
  } catch {
    // Ignore storage quota errors
  }
}

function isPermissionDeniedError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return (
    msg.includes('Missing or insufficient permissions') ||
    msg.includes('permission-denied')
  );
}

function toLocalVehicleDocs(list: Vehicle[]): VehicleFirestoreDoc[] {
  return list.map((v) => {
    const category = normalizeCategory(v.category);
    return {
      ...v,
      category,
      ownerId: SHARED_WORKSPACE_ID,
      photoUrl: resolveVehiclePhoto(v.plate, category, v.photoUrl),
    };
  });
}

function toLocalDocumentDocs(list: VehicleDocumentRecord[]): DocumentFirestoreDoc[] {
  return list.map((d) => ({
    ...d,
    ownerId: SHARED_WORKSPACE_ID,
  }));
}

function toLocalEvidenceDocs(list: VehicleEvidenceRecord[]): EvidenceFirestoreDoc[] {
  return list.map((e) => ({
    ...e,
    ownerId: SHARED_WORKSPACE_ID,
  }));
}

const LEGALIZED_SEED_FLAG = 'pau_brasil_legalized_antt_seeded_v1';

const INITIAL_LEGALIZED_DOCS: LegalizedDocumentRecord[] = [
  {
    id: 'leg-seed-antt-ativo',
    folder: 'ANTT',
    fileName: 'Antt Ativo.png',
    fileType: 'image/png',
    fileSize: 24576,
    plate: 'GERAL',
    expiryDate: '',
    referenceDate: '23/07/2026',
    notes: 'Comprovante ANTT Ativo (07:51) — clique em Anexar para carregar o arquivo PNG',
    uploadedAt: '23/07/2026',
  },
  {
    id: 'leg-seed-certificado-antt',
    folder: 'ANTT',
    fileName: 'CERTIFICADO ANTT.pdf',
    fileType: 'application/pdf',
    fileSize: 145408,
    plate: 'GERAL',
    expiryDate: '',
    referenceDate: '29/03/2025',
    notes: 'Certificado ANTT (10:21) — clique em Anexar para carregar o arquivo PDF',
    uploadedAt: '29/03/2025',
  },
];

function readLocalLegalizedDocs(): LegalizedDocFirestoreDoc[] {
  try {
    const raw = localStorage.getItem(LEGALIZED_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as LegalizedDocumentRecord[]) : [];
    const existingList: LegalizedDocFirestoreDoc[] = Array.isArray(parsed)
      ? parsed.map((d) => ({ ...d, ownerId: SHARED_WORKSPACE_ID }))
      : [];

    if (localStorage.getItem(LEGALIZED_SEED_FLAG) !== '1') {
      const existingIds = new Set(existingList.map((d) => d.id));
      const seeded = INITIAL_LEGALIZED_DOCS.filter((d) => !existingIds.has(d.id)).map((d) => ({
        ...d,
        ownerId: SHARED_WORKSPACE_ID,
      }));
      const merged = [...existingList, ...seeded];
      writeLocalLegalizedDocs(merged);
      localStorage.setItem(LEGALIZED_SEED_FLAG, '1');
      return merged;
    }

    return existingList;
  } catch {
    // Ignore local storage errors
  }
  return INITIAL_LEGALIZED_DOCS.map((d) => ({ ...d, ownerId: SHARED_WORKSPACE_ID }));
}

function writeLocalLegalizedDocs(items: LegalizedDocumentRecord[]): void {
  try {
    const compact = items.map(({ fileDataUrl: _fileDataUrl, ...rest }) => rest);
    localStorage.setItem(LEGALIZED_STORAGE_KEY, JSON.stringify(compact));
  } catch {
    // Ignore storage quota errors
  }
}

export default function App() {
  const [fatalError, setFatalError] = useState<Error | null>(null);
  const [localMode, setLocalMode] = useState(false);

  const [rawVehicles, setRawVehicles] = useState<VehicleFirestoreDoc[]>([]);
  const [documents, setDocuments] = useState<DocumentFirestoreDoc[]>([]);
  const [evidences, setEvidences] = useState<EvidenceFirestoreDoc[]>([]);
  const [legalizedDocs, setLegalizedDocs] = useState<LegalizedDocFirestoreDoc[]>(() =>
    readLocalLegalizedDocs()
  );
  const [legalizedLocalMode, setLegalizedLocalMode] = useState(false);
  const [localLegalizedFileMap, setLocalLegalizedFileMap] = useState<Record<string, string>>({});
  const [remotePhotoByVehicleId, setRemotePhotoByVehicleId] = useState<Record<string, string>>({});
  const [localPhotoByPlate, setLocalPhotoByPlate] = useState<Record<string, string>>({});
  const [lastUpdated, setLastUpdated] = useState<string>(() => nowTimestamp());
  const [firestoreLoaded, setFirestoreLoaded] = useState(false);

  const [activeSection, setActiveSection] = useState<NavSection>('visao-geral');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');

  const [filters, setFilters] = useState<DashboardFilters>({
    period: '12m',
    company: 'Todas',
    sector: 'Todos',
    category: 'Todos',
    status: 'Todos',
    search: '',
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const migrationStartedRef = useRef(false);
  const localFallbackInitializedRef = useRef(false);

  if (fatalError) {
    throw fatalError;
  }

  const captureAsyncError = useCallback((err: unknown) => {
    setFatalError(err instanceof Error ? err : new Error(String(err)));
  }, []);

  const activateLocalFallback = useCallback(() => {
    if (localFallbackInitializedRef.current) return;
    localFallbackInitializedRef.current = true;

    const snap = readLocalSnapshot();
    const ts = snap?.lastUpdated || nowTimestamp();
    const seedVehicles = snap ? snap.vehicles : INITIAL_VEHICLES;
    const seedDocs = snap ? snap.documents : INITIAL_DOCUMENTS;
    const seedEvs = snap ? snap.evidences : INITIAL_EVIDENCES;

    const vDocs = toLocalVehicleDocs(seedVehicles);
    vDocs.sort((a, b) => a.plate.localeCompare(b.plate));
    const dDocs = toLocalDocumentDocs(seedDocs);
    const eDocs = toLocalEvidenceDocs(seedEvs);

    if (!snap) {
      writeLocalSnapshot(vDocs, dDocs, eDocs, ts);
    }

    setRawVehicles(vDocs);
    setDocuments(dDocs);
    setEvidences(eDocs);
    setLastUpdated(ts);
    setLocalMode(true);
    setFirestoreLoaded(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadAllVehiclePhotosFromDb().then((photoMap) => {
      if (!cancelled) {
        setLocalPhotoByPlate(photoMap);
      }
    });
    void loadAllLegalizedFilesFromDb().then((fileMap) => {
      if (!cancelled) {
        setLocalLegalizedFileMap(fileMap);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (localMode) return;
    let active = true;

    let vehiclesReady = false;
    let docsReady = false;
    let evsReady = false;
    let photosReady = false;
    let currentVehicleCount = 0;

    const checkAllLoadedAndMigrate = async () => {
      if (!active || !vehiclesReady || !docsReady || !evsReady || !photosReady) return;
      setFirestoreLoaded(true);

      if (migrationStartedRef.current || currentVehicleCount > 0) return;
      migrationStartedRef.current = true;

      try {
        const metaSnap = await getDoc(doc(db, 'fleetMeta', SHARED_WORKSPACE_ID));
        if (!active) return;

        const localSnap = readLocalSnapshot();
        const localPhotos = await loadAllVehiclePhotosFromDb();
        if (!active) return;

        if (!metaSnap.exists() && localSnap && localSnap.vehicles.length > 0) {
          const ts = localSnap.lastUpdated || nowTimestamp();
          await syncLocalFleetSnapshotToFirestore(
            localSnap.vehicles,
            localSnap.documents,
            localSnap.evidences,
            localPhotos,
            SHARED_WORKSPACE_ID,
            ts
          );
        } else if (!metaSnap.exists()) {
          await upsertFleetMeta(SHARED_WORKSPACE_ID, nowTimestamp(), false);
        }
      } catch (err) {
        if (isPermissionDeniedError(err)) {
          if (active) activateLocalFallback();
        } else {
          captureAsyncError(err);
        }
      }
    };

    const handleListenerError = (
      error: unknown,
      operationType: OperationType,
      path: string
    ) => {
      if (isPermissionDeniedError(error)) {
        if (active) activateLocalFallback();
        return;
      }
      try {
        handleFirestoreError(error, operationType, path);
      } catch (wrapped) {
        captureAsyncError(wrapped);
      }
    };

    const unsubVehicles = onSnapshot(
      buildCollectionQuery('vehicles'),
      (snapshot) => {
        if (!active) return;
        const list = snapshot.docs.map((d) =>
          mapDocToVehicle(d.data() as Record<string, unknown>)
        );
        list.sort((a, b) => a.plate.localeCompare(b.plate));
        currentVehicleCount = list.length;
        setRawVehicles(list);
        vehiclesReady = true;
        void checkAllLoadedAndMigrate();
      },
      (error) => handleListenerError(error, OperationType.LIST, 'vehicles')
    );

    const unsubDocs = onSnapshot(
      buildCollectionQuery('documents'),
      (snapshot) => {
        if (!active) return;
        const list = snapshot.docs.map((d) =>
          mapDocToVehicleDocument(d.data() as Record<string, unknown>)
        );
        setDocuments(list);
        docsReady = true;
        void checkAllLoadedAndMigrate();
      },
      (error) => handleListenerError(error, OperationType.LIST, 'documents')
    );

    const unsubEvs = onSnapshot(
      buildCollectionQuery('evidences'),
      (snapshot) => {
        if (!active) return;
        const list = snapshot.docs.map((d) =>
          mapDocToVehicleEvidence(d.data() as Record<string, unknown>)
        );
        setEvidences(list);
        evsReady = true;
        void checkAllLoadedAndMigrate();
      },
      (error) => handleListenerError(error, OperationType.LIST, 'evidences')
    );

    const unsubPhotos = onSnapshot(
      buildCollectionQuery('vehiclePhotos'),
      (snapshot) => {
        if (!active) return;
        const nextMap: Record<string, string> = {};
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data() as { vehicleId?: string; dataUrl?: string };
          if (data?.dataUrl) {
            nextMap[data.vehicleId || docSnap.id] = data.dataUrl;
          }
        });
        setRemotePhotoByVehicleId(nextMap);
        photosReady = true;
        void checkAllLoadedAndMigrate();
      },
      (error) => handleListenerError(error, OperationType.LIST, 'vehiclePhotos')
    );

    const unsubMeta = onSnapshot(
      doc(db, 'fleetMeta', SHARED_WORKSPACE_ID),
      (snapshot) => {
        if (!active || !snapshot.exists()) return;
        const data = snapshot.data() as { lastUpdatedDisplay?: string };
        if (data?.lastUpdatedDisplay) {
          setLastUpdated(data.lastUpdatedDisplay);
        }
      },
      (error) =>
        handleListenerError(
          error,
          OperationType.GET,
          `fleetMeta/${SHARED_WORKSPACE_ID}`
        )
    );

    return () => {
      active = false;
      unsubVehicles();
      unsubDocs();
      unsubEvs();
      unsubPhotos();
      unsubMeta();
    };
  }, [localMode, captureAsyncError, activateLocalFallback]);

  useEffect(() => {
    if (localMode || legalizedLocalMode) return;
    let active = true;

    const unsubLegalized = onSnapshot(
      buildCollectionQuery('legalizedDocs'),
      (snapshot) => {
        if (!active) return;
        const list = snapshot.docs.map((d) =>
          mapDocToLegalizedDoc(d.data() as Record<string, unknown>)
        );
        setLegalizedDocs(list);
      },
      (error) => {
        if (isPermissionDeniedError(error)) {
          if (active) {
            setLegalizedLocalMode(true);
            setLegalizedDocs(readLocalLegalizedDocs());
          }
          return;
        }
        try {
          handleFirestoreError(error, OperationType.LIST, 'legalizedDocs');
        } catch (wrapped) {
          captureAsyncError(wrapped);
        }
      }
    );

    return () => {
      active = false;
      unsubLegalized();
    };
  }, [localMode, legalizedLocalMode, captureAsyncError]);

  const resolvedLegalizedDocs: LegalizedDocFirestoreDoc[] = useMemo(() => {
    return legalizedDocs.map((d) => ({
      ...d,
      fileDataUrl: localLegalizedFileMap[d.id] || d.fileDataUrl,
    }));
  }, [legalizedDocs, localLegalizedFileMap]);

  const vehicles: VehicleFirestoreDoc[] = useMemo(() => {
    return rawVehicles.map((v) => {
      const normPlate = v.plate.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      const customPhoto = remotePhotoByVehicleId[v.id] || localPhotoByPlate[normPlate];
      return {
        ...v,
        photoUrl: resolveVehiclePhoto(v.plate, v.category, customPhoto || v.photoUrl),
      };
    });
  }, [rawVehicles, remotePhotoByVehicleId, localPhotoByPlate]);

  useEffect(() => {
    if (vehicles.length === 0) {
      if (selectedVehicleId !== '') setSelectedVehicleId('');
      return;
    }
    const stillExists = vehicles.some((v) => v.id === selectedVehicleId);
    if (!stillExists) {
      setSelectedVehicleId(vehicles[0].id);
    }
  }, [vehicles, selectedVehicleId]);

  const commitLocalState = useCallback(
    (
      nextVehicles: VehicleFirestoreDoc[],
      nextDocuments: DocumentFirestoreDoc[],
      nextEvidences: EvidenceFirestoreDoc[],
      ts: string
    ) => {
      const sorted = [...nextVehicles].sort((a, b) => a.plate.localeCompare(b.plate));
      setRawVehicles(sorted);
      setDocuments(nextDocuments);
      setEvidences(nextEvidences);
      writeLocalSnapshot(sorted, nextDocuments, nextEvidences, ts);
    },
    []
  );

  const handleSaveVehicle = (vehicle: Vehicle, isEdit: boolean) => {
    const ts = nowTimestamp();
    setLastUpdated(ts);
    const existingVeh = rawVehicles.find((v) => v.id === vehicle.id);
    const existingEv = evidences.find((e) => e.vehicleId === vehicle.id);
    if (!isEdit) {
      setSelectedVehicleId(vehicle.id);
    }

    const applyLocal = () => {
      const safeId = sanitizeFirestoreId(vehicle.id);
      const vehDoc: VehicleFirestoreDoc = {
        ...vehicle,
        id: safeId,
        ownerId: existingVeh?.ownerId || SHARED_WORKSPACE_ID,
      };
      const nextVehicles = isEdit
        ? rawVehicles.map((v) => (v.id === safeId ? vehDoc : v))
        : [...rawVehicles, vehDoc];

      let nextDocuments = documents;
      let nextEvidences = evidences;

      if (isEdit) {
        nextDocuments = documents.map((d) =>
          d.vehicleId === safeId
            ? {
                ...d,
                plate: vehicle.plate.trim().toUpperCase(),
                model: vehicle.manufacturerModel.trim(),
                sector: vehicle.sector,
              }
            : d
        );
        nextEvidences = evidences.map((e) =>
          e.vehicleId === safeId
            ? {
                ...e,
                plate: vehicle.plate.trim().toUpperCase(),
                model: vehicle.manufacturerModel.trim(),
                sector: vehicle.sector,
              }
            : e
        );
      } else {
        const newEvidence: EvidenceFirestoreDoc = {
          vehicleId: safeId,
          ownerId: SHARED_WORKSPACE_ID,
          plate: vehicle.plate,
          model: vehicle.manufacturerModel,
          sector: vehicle.sector,
          crlv: true,
          cnt: true,
          antt: true,
          crlvFile: `CRLV_${vehicle.plate}.pdf`,
          cntFile: `CNT_${vehicle.plate}.pdf`,
          anttFile: `ANTT_${vehicle.plate}.pdf`,
          updatedAt: new Date().toLocaleDateString('pt-BR'),
        };
        const docId = `doc-${Date.now()}`;
        const newDoc: DocumentFirestoreDoc = {
          id: docId,
          ownerId: SHARED_WORKSPACE_ID,
          vehicleId: safeId,
          plate: vehicle.plate,
          model: vehicle.manufacturerModel,
          sector: vehicle.sector,
          type: 'CRLV',
          status: 'Regular',
          expiryDate: vehicle.expiryDates.crlv,
          protocol: `CRLV-${Math.floor(10000 + Math.random() * 90000)}`,
          responsible: 'Gestão Brejo',
        };
        nextEvidences = [...evidences, newEvidence];
        nextDocuments = [...documents, newDoc];
      }

      commitLocalState(nextVehicles, nextDocuments, nextEvidences, ts);
    };

    if (localMode) {
      applyLocal();
      return;
    }

    void saveVehicleBundle(
      vehicle,
      SHARED_WORKSPACE_ID,
      isEdit,
      existingVeh,
      documents,
      existingEv,
      ts
    ).catch((err) => {
      if (isPermissionDeniedError(err)) {
        localFallbackInitializedRef.current = true;
        setLocalMode(true);
        applyLocal();
      } else {
        captureAsyncError(err);
      }
    });
  };

  const handleImportVehicles = (imported: Vehicle[], mode: 'merge' | 'replace') => {
    const ts = nowTimestamp();
    setLastUpdated(ts);
    const existingPhotoIds = new Set(Object.keys(remotePhotoByVehicleId));

    const applyLocal = () => {
      const normPlate = (p: string) => p.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      const baseVehicles = mode === 'replace' ? [] : rawVehicles;
      const byPlate = new Map(baseVehicles.map((v) => [normPlate(v.plate), v]));

      const vehicleMap = new Map(baseVehicles.map((v) => [v.id, v]));
      let nextDocs = mode === 'replace' ? [] : [...documents];
      const evMap = new Map(
        (mode === 'replace' ? [] : evidences).map((e) => [e.vehicleId, e])
      );
      let firstId = '';

      // Consolidate duplicate plates within the same batch before saving
      const dedupedByPlate = new Map<string, Vehicle>();
      for (const imp of imported) {
        dedupedByPlate.set(normPlate(imp.plate) || imp.id, imp);
      }

      for (const imp of dedupedByPlate.values()) {
        const plateKey = normPlate(imp.plate);
        const match = plateKey ? byPlate.get(plateKey) : undefined;
        const targetId = match ? match.id : sanitizeFirestoreId(imp.id);
        if (!firstId) firstId = targetId;

        const veh: VehicleFirestoreDoc = {
          ...imp,
          id: targetId,
          ownerId: match?.ownerId || SHARED_WORKSPACE_ID,
          photoUrl: resolveVehiclePhoto(imp.plate, imp.category, match?.photoUrl || imp.photoUrl),
        };
        vehicleMap.set(targetId, veh);
        if (plateKey) {
          byPlate.set(plateKey, veh);
        }

        nextDocs = nextDocs.filter((d) => d.vehicleId !== targetId);
        const freshDocs = buildDocumentsForVehicle(veh).map((d) => ({
          ...d,
          ownerId: veh.ownerId,
        }));
        nextDocs.push(...freshDocs);

        const builtEv = buildEvidenceForVehicle(veh);
        const oldEv = evMap.get(targetId);
        evMap.set(targetId, {
          ...builtEv,
          ownerId: veh.ownerId,
          crlv: oldEv ? oldEv.crlv || builtEv.crlv : builtEv.crlv,
          cnt: oldEv ? oldEv.cnt || builtEv.cnt : builtEv.cnt,
          antt: oldEv ? oldEv.antt || builtEv.antt : builtEv.antt,
          crlvFile: oldEv?.crlvFile ?? builtEv.crlvFile,
          cntFile: oldEv?.cntFile ?? builtEv.cntFile,
          anttFile: oldEv?.anttFile ?? builtEv.anttFile,
        });
      }

      commitLocalState(
        Array.from(vehicleMap.values()),
        nextDocs,
        Array.from(evMap.values()),
        ts
      );
      if (firstId && (mode === 'replace' || !selectedVehicleId)) {
        setSelectedVehicleId(firstId);
      }
    };

    if (localMode) {
      applyLocal();
      return;
    }

    void importFleetToFirestore(
      imported,
      mode,
      SHARED_WORKSPACE_ID,
      rawVehicles,
      documents,
      evidences,
      existingPhotoIds,
      localPhotoByPlate,
      ts
    )
      .then((firstId) => {
        if (firstId && (mode === 'replace' || !selectedVehicleId)) {
          setSelectedVehicleId(firstId);
        }
      })
      .catch((err) => {
        if (isPermissionDeniedError(err)) {
          localFallbackInitializedRef.current = true;
          setLocalMode(true);
          applyLocal();
        } else {
          captureAsyncError(err);
        }
      });
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    const ts = nowTimestamp();
    setLastUpdated(ts);
    const hasEv = evidences.some((e) => e.vehicleId === vehicleId);
    const hasPhoto = Boolean(remotePhotoByVehicleId[vehicleId]);

    const applyLocal = () => {
      const safeId = sanitizeFirestoreId(vehicleId);
      commitLocalState(
        rawVehicles.filter((v) => v.id !== safeId),
        documents.filter((d) => d.vehicleId !== safeId),
        evidences.filter((e) => e.vehicleId !== safeId),
        ts
      );
    };

    if (localMode) {
      applyLocal();
      return;
    }

    void deleteVehicleBundle(
      vehicleId,
      documents,
      hasEv,
      hasPhoto,
      SHARED_WORKSPACE_ID,
      ts
    ).catch((err) => {
      if (isPermissionDeniedError(err)) {
        localFallbackInitializedRef.current = true;
        setLocalMode(true);
        applyLocal();
      } else {
        captureAsyncError(err);
      }
    });
  };

  const handleToggleVehicleStatus = (vehicleId: string) => {
    const target = rawVehicles.find((v) => v.id === vehicleId);
    if (!target) return;
    const ts = nowTimestamp();
    setLastUpdated(ts);

    const applyLocal = () => {
      const nextStatus: VehicleStatus = target.status === 'Ativo' ? 'Parado' : 'Ativo';
      const nextVehicles = rawVehicles.map((v) =>
        v.id === vehicleId ? { ...v, status: nextStatus } : v
      );
      commitLocalState(nextVehicles, documents, evidences, ts);
    };

    if (localMode) {
      applyLocal();
      return;
    }

    void toggleVehicleStatusInFirestore(target, SHARED_WORKSPACE_ID, ts).catch((err) => {
      if (isPermissionDeniedError(err)) {
        localFallbackInitializedRef.current = true;
        setLocalMode(true);
        applyLocal();
      } else {
        captureAsyncError(err);
      }
    });
  };

  const handleUpdateVehiclePhoto = (vehicleId: string, photoUrl: string) => {
    const target = rawVehicles.find((v) => v.id === vehicleId);
    if (!target) return;
    const ts = nowTimestamp();
    setLastUpdated(ts);

    const normPlate = target.plate.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (photoUrl.startsWith('data:')) {
      setLocalPhotoByPlate((prev) => ({ ...prev, [normPlate]: photoUrl }));
      setRemotePhotoByVehicleId((prev) => ({ ...prev, [vehicleId]: photoUrl }));
      void saveVehiclePhotoToDb(target.plate, photoUrl);
      if (!localMode) {
        void saveVehiclePhotoInFirestore(target, photoUrl, SHARED_WORKSPACE_ID, ts).catch(
          (err) => {
            if (isPermissionDeniedError(err)) {
              localFallbackInitializedRef.current = true;
              setLocalMode(true);
            } else {
              captureAsyncError(err);
            }
          }
        );
      }
    }
  };

  const handleToggleChecklistItem = (vehicleId: string, key: ChecklistKey) => {
    const target = rawVehicles.find((v) => v.id === vehicleId);
    if (!target) return;
    const ts = nowTimestamp();
    setLastUpdated(ts);
    const nextChecklist = {
      ...target.checklist,
      [key]: !target.checklist[key],
    };

    const applyLocal = () => {
      const nextVehicles = rawVehicles.map((v) =>
        v.id === vehicleId ? { ...v, checklist: nextChecklist } : v
      );
      commitLocalState(nextVehicles, documents, evidences, ts);
    };

    if (localMode) {
      applyLocal();
      return;
    }

    void updateVehicleChecklistInFirestore(target, nextChecklist, SHARED_WORKSPACE_ID, ts).catch(
      (err) => {
        if (isPermissionDeniedError(err)) {
          localFallbackInitializedRef.current = true;
          setLocalMode(true);
          applyLocal();
        } else {
          captureAsyncError(err);
        }
      }
    );
  };

  const handleMarkAllChecklist = (vehicleId: string, value: boolean) => {
    const target = rawVehicles.find((v) => v.id === vehicleId);
    if (!target) return;
    const ts = nowTimestamp();
    setLastUpdated(ts);
    const nextChecklist = Object.fromEntries(
      CHECKLIST_ITEMS.map((item) => [item.key, value])
    ) as Vehicle['checklist'];

    const applyLocal = () => {
      const nextVehicles = rawVehicles.map((v) =>
        v.id === vehicleId ? { ...v, checklist: nextChecklist } : v
      );
      commitLocalState(nextVehicles, documents, evidences, ts);
    };

    if (localMode) {
      applyLocal();
      return;
    }

    void updateVehicleChecklistInFirestore(target, nextChecklist, SHARED_WORKSPACE_ID, ts).catch(
      (err) => {
        if (isPermissionDeniedError(err)) {
          localFallbackInitializedRef.current = true;
          setLocalMode(true);
          applyLocal();
        } else {
          captureAsyncError(err);
        }
      }
    );
  };

  const handleUpdateDocument = (
    docId: string,
    status: DocumentStatus,
    expiryDate: string
  ) => {
    const ts = nowTimestamp();
    setLastUpdated(ts);

    const applyLocal = () => {
      const nextDocuments = documents.map((d) =>
        d.id === docId ? { ...d, status, expiryDate } : d
      );
      commitLocalState(rawVehicles, nextDocuments, evidences, ts);
    };

    if (localMode) {
      applyLocal();
      return;
    }

    void updateDocumentInFirestore(docId, status, expiryDate, SHARED_WORKSPACE_ID, ts).catch(
      (err) => {
        if (isPermissionDeniedError(err)) {
          localFallbackInitializedRef.current = true;
          setLocalMode(true);
          applyLocal();
        } else {
          captureAsyncError(err);
        }
      }
    );
  };

  const handleAddDocument = (docRecord: VehicleDocumentRecord) => {
    const ts = nowTimestamp();
    setLastUpdated(ts);
    const targetVehicle = rawVehicles.find((v) => v.id === docRecord.vehicleId);
    const docOwnerId = targetVehicle?.ownerId || SHARED_WORKSPACE_ID;

    const applyLocal = () => {
      const safeId = sanitizeFirestoreId(docRecord.id);
      const nextDoc: DocumentFirestoreDoc = {
        ...docRecord,
        id: safeId,
        ownerId: docOwnerId,
      };
      commitLocalState(rawVehicles, [...documents, nextDoc], evidences, ts);
    };

    if (localMode) {
      applyLocal();
      return;
    }

    void addDocumentInFirestore(docRecord, docOwnerId, ts).catch((err) => {
      if (isPermissionDeniedError(err)) {
        localFallbackInitializedRef.current = true;
        setLocalMode(true);
        applyLocal();
      } else {
        captureAsyncError(err);
      }
    });
  };

  const handleToggleEvidenceField = (
    vehicleId: string,
    field: 'crlv' | 'cnt' | 'antt',
    fileName?: string
  ) => {
    const target = evidences.find((e) => e.vehicleId === vehicleId);
    if (!target) return;
    const ts = nowTimestamp();
    setLastUpdated(ts);

    const applyLocal = () => {
      const nextVal = fileName ? true : !target[field];
      const fileKey =
        field === 'crlv' ? 'crlvFile' : field === 'cnt' ? 'cntFile' : 'anttFile';
      const nextFile =
        fileName ?? (nextVal ? `${field.toUpperCase()}_${target.plate}.pdf` : '');
      const nextEvidences = evidences.map((e) =>
        e.vehicleId === vehicleId
          ? {
              ...e,
              [field]: nextVal,
              [fileKey]: nextFile || undefined,
              updatedAt: new Date().toLocaleDateString('pt-BR'),
            }
          : e
      );
      commitLocalState(rawVehicles, documents, nextEvidences, ts);
    };

    if (localMode) {
      applyLocal();
      return;
    }

    void toggleEvidenceFieldInFirestore(target, field, fileName, SHARED_WORKSPACE_ID, ts).catch(
      (err) => {
        if (isPermissionDeniedError(err)) {
          localFallbackInitializedRef.current = true;
          setLocalMode(true);
          applyLocal();
        } else {
          captureAsyncError(err);
        }
      }
    );
  };

  const handleClearAllData = () => {
    const ts = nowTimestamp();
    setLastUpdated(ts);
    setSelectedVehicleId('');
    setLocalPhotoByPlate({});
    void clearAllVehiclePhotosFromDb();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }

    if (localMode) {
      commitLocalState([], [], [], ts);
      return;
    }

    void clearAllFleetInFirestore(
      SHARED_WORKSPACE_ID,
      rawVehicles.map((v) => v.id),
      documents.map((d) => d.id),
      evidences.map((e) => e.vehicleId),
      ts,
      true
    ).catch((err) => {
      if (isPermissionDeniedError(err)) {
        localFallbackInitializedRef.current = true;
        setLocalMode(true);
        commitLocalState([], [], [], ts);
      } else {
        captureAsyncError(err);
      }
    });
  };

  const handleLoadDefaultFleet = () => {
    const ts = nowTimestamp();
    setLastUpdated(ts);
    const existingPhotoIds = new Set(Object.keys(remotePhotoByVehicleId));

    const applyLocal = () => {
      const seedVehicles = toLocalVehicleDocs(INITIAL_VEHICLES);
      const seedDocs = toLocalDocumentDocs(INITIAL_DOCUMENTS);
      const seedEvs = toLocalEvidenceDocs(INITIAL_EVIDENCES);
      commitLocalState(seedVehicles, seedDocs, seedEvs, ts);
    };

    if (localMode) {
      applyLocal();
      return;
    }

    void loadDefaultFleetToFirestore(
      SHARED_WORKSPACE_ID,
      ts,
      rawVehicles,
      documents,
      evidences,
      existingPhotoIds,
      localPhotoByPlate
    ).catch((err) => {
      if (isPermissionDeniedError(err)) {
        localFallbackInitializedRef.current = true;
        setLocalMode(true);
        applyLocal();
      } else {
        captureAsyncError(err);
      }
    });
  };

  const handleUpdateLegalizedDoc = (id: string, patch: Partial<LegalizedDocumentRecord>) => {
    const ts = nowTimestamp();
    setLastUpdated(ts);
    const existing = legalizedDocs.find((d) => d.id === id);

    if (patch.fileDataUrl) {
      void saveLegalizedFileToDb(id, patch.fileDataUrl);
      setLocalLegalizedFileMap((prev) => ({ ...prev, [id]: patch.fileDataUrl! }));
    }

    const applyLocal = () => {
      setLegalizedDocs((prev) => {
        const next = prev.map((d) => (d.id === id ? { ...d, ...patch } : d));
        writeLocalLegalizedDocs(next);
        return next;
      });
    };

    if (localMode || legalizedLocalMode || !existing) {
      applyLocal();
      return;
    }

    void updateLegalizedDocInFirestore(existing, patch, SHARED_WORKSPACE_ID, ts).catch((err) => {
      if (isPermissionDeniedError(err)) {
        setLegalizedLocalMode(true);
        applyLocal();
      } else {
        captureAsyncError(err);
      }
    });
  };

  const handleAddLegalizedDocs = (items: LegalizedDocumentRecord[]) => {
    const baseName = (name: string) =>
      name
        .replace(/\.[^.]+$/, '')
        .trim()
        .toLowerCase();

    const remainingToAdd: LegalizedDocumentRecord[] = [];
    for (const item of items) {
      const pendingMatch = legalizedDocs.find(
        (existing) =>
          existing.folder === item.folder &&
          !existing.fileDataUrl &&
          !localLegalizedFileMap[existing.id] &&
          baseName(existing.fileName) === baseName(item.fileName)
      );
      if (pendingMatch) {
        handleUpdateLegalizedDoc(pendingMatch.id, {
          fileName: item.fileName,
          fileType: item.fileType,
          fileSize: item.fileSize,
          fileDataUrl: item.fileDataUrl,
          uploadedAt: item.uploadedAt,
          notes:
            pendingMatch.notes.includes('clique em Anexar') ? item.notes : pendingMatch.notes,
        });
      } else {
        remainingToAdd.push(item);
      }
    }

    if (remainingToAdd.length === 0) return;

    const ts = nowTimestamp();
    setLastUpdated(ts);

    const newFileEntries: Record<string, string> = {};
    for (const item of remainingToAdd) {
      if (item.fileDataUrl) {
        newFileEntries[item.id] = item.fileDataUrl;
        void saveLegalizedFileToDb(item.id, item.fileDataUrl);
      }
    }
    if (Object.keys(newFileEntries).length > 0) {
      setLocalLegalizedFileMap((prev) => ({ ...prev, ...newFileEntries }));
    }

    const applyLocal = () => {
      setLegalizedDocs((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const uniqueNew = remainingToAdd
          .filter((i) => !existingIds.has(i.id))
          .map((i) => ({ ...i, ownerId: SHARED_WORKSPACE_ID }));
        if (uniqueNew.length === 0) return prev;
        const next: LegalizedDocFirestoreDoc[] = [...uniqueNew, ...prev];
        writeLocalLegalizedDocs(next);
        return next;
      });
    };

    if (localMode || legalizedLocalMode) {
      applyLocal();
      return;
    }

    for (const item of remainingToAdd) {
      void addLegalizedDocInFirestore(item, SHARED_WORKSPACE_ID, ts).catch((err) => {
        if (isPermissionDeniedError(err)) {
          setLegalizedLocalMode(true);
          applyLocal();
        } else {
          captureAsyncError(err);
        }
      });
    }
  };

  const handleDeleteLegalizedDoc = (id: string) => {
    const ts = nowTimestamp();
    setLastUpdated(ts);
    void deleteLegalizedFileFromDb(id);
    setLocalLegalizedFileMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    const applyLocal = () => {
      setLegalizedDocs((prev) => {
        const next = prev.filter((d) => d.id !== id);
        writeLocalLegalizedDocs(next);
        return next;
      });
    };

    if (localMode || legalizedLocalMode) {
      applyLocal();
      return;
    }

    void deleteLegalizedDocInFirestore(id, SHARED_WORKSPACE_ID, ts).catch((err) => {
      if (isPermissionDeniedError(err)) {
        setLegalizedLocalMode(true);
        applyLocal();
      } else {
        captureAsyncError(err);
      }
    });
  };

  return (
    <div className="min-h-screen flex bg-[#EEF3F9] text-slate-900">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onOpenImportModal={() => setImportModalOpen(true)}
        onLoadDefaultFleet={handleLoadDefaultFleet}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <HeaderBar
          activeSection={activeSection}
          lastUpdated={lastUpdated}
          onSelectSection={setActiveSection}
          onToggleMenu={() => setMobileMenuOpen(true)}
          onAddVehicle={() => {
            setEditingVehicle(null);
            setModalOpen(true);
          }}
        />

        <main className="flex-1 flex flex-col px-4 py-2.5 sm:px-5 sm:py-2.5 w-full">
          {!firestoreLoaded ? (
            <div className="rounded-xl bg-white border border-slate-200 p-12 text-center">
              <div className="w-7 h-7 border-2 border-[#0A2E5C] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-medium text-slate-600">
                Carregando dados da frota...
              </p>
            </div>
          ) : (
            <>
              {activeSection === 'documentos-legalizados' && (
                <LegalizedDocumentsView
                  records={resolvedLegalizedDocs}
                  vehicles={vehicles}
                  onAddRecords={handleAddLegalizedDocs}
                  onUpdateRecord={handleUpdateLegalizedDoc}
                  onDeleteRecord={handleDeleteLegalizedDoc}
                />
              )}

              {activeSection === 'processo-garantia' && (
                <ProcessGuaranteeView />
              )}

              {activeSection === 'visao-geral' && (
                <OverviewView
                  vehicles={vehicles}
                  documents={documents}
                  evidences={evidences}
                  filters={filters}
                  selectedVehicleId={selectedVehicleId}
                  onFiltersChange={setFilters}
                  onSelectVehicle={setSelectedVehicleId}
                  onToggleChecklistItem={handleToggleChecklistItem}
                  onNavigate={setActiveSection}
                  onEditVehicle={(v) => {
                    setEditingVehicle(v);
                    setModalOpen(true);
                  }}
                  onUpdateVehiclePhoto={handleUpdateVehiclePhoto}
                  onAddVehicle={() => {
                    setEditingVehicle(null);
                    setModalOpen(true);
                  }}
                  onOpenImportModal={() => setImportModalOpen(true)}
                  onLoadDefaultFleet={handleLoadDefaultFleet}
                />
              )}

              {activeSection === 'cadastro' && (
                <FleetRegistryView
                  vehicles={vehicles}
                  onAddVehicle={() => {
                    setEditingVehicle(null);
                    setModalOpen(true);
                  }}
                  onImportPlanilha={() => setImportModalOpen(true)}
                  onLoadDefaultFleet={handleLoadDefaultFleet}
                  onClearAllFleet={handleClearAllData}
                  onEditVehicle={(v) => {
                    setEditingVehicle(v);
                    setModalOpen(true);
                  }}
                  onDeleteVehicle={handleDeleteVehicle}
                  onToggleStatus={handleToggleVehicleStatus}
                  onInspectVehicle={(id) => {
                    setSelectedVehicleId(id);
                    setActiveSection('visao-geral');
                  }}
                />
              )}

              {activeSection === 'documentos' && (
                <DocumentsView
                  documents={documents}
                  vehicles={vehicles}
                  onUpdateDocument={handleUpdateDocument}
                  onAddDocument={handleAddDocument}
                />
              )}

              {activeSection === 'evidencias' && (
                <EvidencesView
                  evidences={evidences}
                  onToggleEvidenceField={handleToggleEvidenceField}
                />
              )}

              {activeSection === 'checklists' && (
                <ChecklistsView
                  vehicles={vehicles}
                  selectedVehicleId={selectedVehicleId}
                  onSelectVehicle={setSelectedVehicleId}
                  onToggleChecklistItem={handleToggleChecklistItem}
                  onMarkAllChecklist={handleMarkAllChecklist}
                />
              )}
            </>
          )}
        </main>
      </div>

      <VehicleModal
        isOpen={modalOpen}
        editingVehicle={editingVehicle}
        onClose={() => {
          setModalOpen(false);
          setEditingVehicle(null);
        }}
        onSave={handleSaveVehicle}
      />

      <ImportFleetModal
        isOpen={importModalOpen}
        existingCount={vehicles.length}
        onClose={() => setImportModalOpen(false)}
        onConfirmImport={handleImportVehicles}
      />
    </div>
  );
}
