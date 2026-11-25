/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import {
  ChecklistKey,
  ComplianceCheckRecord,
  DashboardFilters,
  DocumentStatus,
  LegalizedDocumentRecord,
  NavSection,
  Vehicle,
  VehicleDocumentRecord,
} from './types/fleet';
import { CHECKLIST_ITEMS, resolveVehiclePhoto } from './data/fleetSeed';
import {
  OperationType,
  SHARED_WORKSPACE_ID,
  db,
  handleFirestoreError,
} from './firebase';
import {
  ComplianceCheckFirestoreDoc,
  DocumentFirestoreDoc,
  EvidenceFirestoreDoc,
  LegalizedDocFirestoreDoc,
  VehicleFirestoreDoc,
  addComplianceChecksInFirestore,
  addDocumentInFirestore,
  addLegalizedDocInFirestore,
  buildCollectionQuery,
  clearAllFleetInFirestore,
  deleteComplianceCheckInFirestore,
  deleteLegalizedDocInFirestore,
  deleteVehicleBundle,
  importFleetToFirestore,
  loadDefaultFleetToFirestore,
  mapDocToComplianceCheck,
  mapDocToLegalizedDoc,
  mapDocToVehicle,
  mapDocToVehicleDocument,
  mapDocToVehicleEvidence,
  saveVehicleBundle,
  saveVehiclePhotoInFirestore,
  toggleEvidenceFieldInFirestore,
  toggleVehicleStatusInFirestore,
  updateComplianceCheckInFirestore,
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
import { SanitaryLaudoView } from './components/SanitaryLaudoView';
import { Bloco1HubView } from './components/Bloco1HubView';
import { ComplianceCheckView } from './components/ComplianceCheckView';
import { VehicleModal } from './components/VehicleModal';
import { ImportFleetModal } from './components/ImportFleetModal';

function nowTimestamp(): string {
  const d = new Date();
  const datePart = d.toLocaleDateString('pt-BR');
  const timePart = d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${datePart} ${timePart}`;
}

export default function App() {
  const [fatalError, setFatalError] = useState<Error | null>(null);

  const [rawVehicles, setRawVehicles] = useState<VehicleFirestoreDoc[]>([]);
  const [documents, setDocuments] = useState<DocumentFirestoreDoc[]>([]);
  const [evidences, setEvidences] = useState<EvidenceFirestoreDoc[]>([]);
  const [legalizedDocs, setLegalizedDocs] = useState<LegalizedDocFirestoreDoc[]>([]);
  const [complianceChecks, setComplianceChecks] = useState<ComplianceCheckFirestoreDoc[]>([]);
  const [remotePhotoByVehicleId, setRemotePhotoByVehicleId] = useState<Record<string, string>>({});
  const [lastUpdated, setLastUpdated] = useState<string>(() => nowTimestamp());
  const [firestoreLoaded, setFirestoreLoaded] = useState(false);

  const [activeSection, setActiveSection] = useState<NavSection>('bloco-1');
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

  const metaInitCheckedRef = useRef(false);

  if (fatalError) {
    throw fatalError;
  }

  const captureAsyncError = useCallback((err: unknown) => {
    setFatalError(err instanceof Error ? err : new Error(String(err)));
  }, []);

  useEffect(() => {
    let active = true;

    let vehiclesReady = false;
    let docsReady = false;
    let evsReady = false;
    let photosReady = false;
    let legalizedReady = false;
    let complianceReady = false;

    const checkAllLoaded = async () => {
      if (
        !active ||
        !vehiclesReady ||
        !docsReady ||
        !evsReady ||
        !photosReady ||
        !legalizedReady ||
        !complianceReady
      ) {
        return;
      }
      setFirestoreLoaded(true);

      if (metaInitCheckedRef.current) return;
      metaInitCheckedRef.current = true;

      try {
        const metaSnap = await getDoc(doc(db, 'fleetMeta', SHARED_WORKSPACE_ID));
        if (!active) return;
        if (!metaSnap.exists()) {
          await upsertFleetMeta(SHARED_WORKSPACE_ID, nowTimestamp(), true);
        }
      } catch (err) {
        if (active) {
          captureAsyncError(err);
        }
      }
    };

    const handleListenerError = (
      error: unknown,
      operationType: OperationType,
      path: string
    ) => {
      try {
        handleFirestoreError(error, operationType, path);
      } catch (wrapped) {
        if (active) {
          captureAsyncError(wrapped);
        }
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
        setRawVehicles(list);
        vehiclesReady = true;
        void checkAllLoaded();
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
        void checkAllLoaded();
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
        void checkAllLoaded();
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
        void checkAllLoaded();
      },
      (error) => handleListenerError(error, OperationType.LIST, 'vehiclePhotos')
    );

    const unsubLegalized = onSnapshot(
      buildCollectionQuery('legalizedDocs'),
      (snapshot) => {
        if (!active) return;
        const list = snapshot.docs.map((d) =>
          mapDocToLegalizedDoc(d.data() as Record<string, unknown>)
        );
        setLegalizedDocs(list);
        legalizedReady = true;
        void checkAllLoaded();
      },
      (error) => handleListenerError(error, OperationType.LIST, 'legalizedDocs')
    );

    const unsubCompliance = onSnapshot(
      buildCollectionQuery('complianceChecks'),
      (snapshot) => {
        if (!active) return;
        const list = snapshot.docs.map((d) =>
          mapDocToComplianceCheck(d.data() as Record<string, unknown>)
        );
        list.sort((a, b) => a.plate.localeCompare(b.plate));
        setComplianceChecks(list);
        complianceReady = true;
        void checkAllLoaded();
      },
      (error) => handleListenerError(error, OperationType.LIST, 'complianceChecks')
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
      unsubLegalized();
      unsubCompliance();
      unsubMeta();
    };
  }, [captureAsyncError]);

  const legalized111Docs = useMemo(
    () => legalizedDocs.filter((d) => d.folder !== 'LAUDO DE VIGILÂNCIA SANITÁRIA'),
    [legalizedDocs]
  );

  const sanitaryLaudoDocs = useMemo(
    () => legalizedDocs.filter((d) => d.folder === 'LAUDO DE VIGILÂNCIA SANITÁRIA'),
    [legalizedDocs]
  );

  const vehicles: VehicleFirestoreDoc[] = useMemo(() => {
    return rawVehicles.map((v) => {
      const customPhoto = remotePhotoByVehicleId[v.id];
      return {
        ...v,
        photoUrl: resolveVehiclePhoto(v.plate, v.category, customPhoto || v.photoUrl),
      };
    });
  }, [rawVehicles, remotePhotoByVehicleId]);

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

  const handleSaveVehicle = (vehicle: Vehicle, isEdit: boolean) => {
    const ts = nowTimestamp();
    setLastUpdated(ts);
    const existingVeh = rawVehicles.find((v) => v.id === vehicle.id);
    const existingEv = evidences.find((e) => e.vehicleId === vehicle.id);
    if (!isEdit) {
      setSelectedVehicleId(vehicle.id);
    }

    void saveVehicleBundle(
      vehicle,
      SHARED_WORKSPACE_ID,
      isEdit,
      existingVeh,
      documents,
      existingEv,
      ts
    ).catch(captureAsyncError);
  };

  const handleImportVehicles = (imported: Vehicle[], mode: 'merge' | 'replace') => {
    const ts = nowTimestamp();
    setLastUpdated(ts);

    void importFleetToFirestore(
      imported,
      mode,
      SHARED_WORKSPACE_ID,
      rawVehicles,
      documents,
      evidences,
      ts
    )
      .then((firstId) => {
        if (firstId && (mode === 'replace' || !selectedVehicleId)) {
          setSelectedVehicleId(firstId);
        }
      })
      .catch(captureAsyncError);
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    const ts = nowTimestamp();
    setLastUpdated(ts);
    const hasEv = evidences.some((e) => e.vehicleId === vehicleId);
    const hasPhoto = Boolean(remotePhotoByVehicleId[vehicleId]);

    void deleteVehicleBundle(
      vehicleId,
      documents,
      hasEv,
      hasPhoto,
      SHARED_WORKSPACE_ID,
      ts
    ).catch(captureAsyncError);
  };

  const handleToggleVehicleStatus = (vehicleId: string) => {
    const target = rawVehicles.find((v) => v.id === vehicleId);
    if (!target) return;
    const ts = nowTimestamp();
    setLastUpdated(ts);

    void toggleVehicleStatusInFirestore(target, SHARED_WORKSPACE_ID, ts).catch(captureAsyncError);
  };

  const handleUpdateVehiclePhoto = (vehicleId: string, photoUrl: string) => {
    const target = rawVehicles.find((v) => v.id === vehicleId);
    if (!target || !photoUrl.startsWith('data:')) return;
    const ts = nowTimestamp();
    setLastUpdated(ts);

    void saveVehiclePhotoInFirestore(target, photoUrl, SHARED_WORKSPACE_ID, ts).catch(
      captureAsyncError
    );
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

    void updateVehicleChecklistInFirestore(target, nextChecklist, SHARED_WORKSPACE_ID, ts).catch(
      captureAsyncError
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

    void updateVehicleChecklistInFirestore(target, nextChecklist, SHARED_WORKSPACE_ID, ts).catch(
      captureAsyncError
    );
  };

  const handleUpdateDocument = (
    docId: string,
    status: DocumentStatus,
    expiryDate: string
  ) => {
    const ts = nowTimestamp();
    setLastUpdated(ts);

    void updateDocumentInFirestore(docId, status, expiryDate, SHARED_WORKSPACE_ID, ts).catch(
      captureAsyncError
    );
  };

  const handleAddDocument = (docRecord: VehicleDocumentRecord) => {
    const ts = nowTimestamp();
    setLastUpdated(ts);
    const targetVehicle = rawVehicles.find((v) => v.id === docRecord.vehicleId);
    const docOwnerId = targetVehicle?.ownerId || SHARED_WORKSPACE_ID;

    void addDocumentInFirestore(docRecord, docOwnerId, ts).catch(captureAsyncError);
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

    void toggleEvidenceFieldInFirestore(target, field, fileName, SHARED_WORKSPACE_ID, ts).catch(
      captureAsyncError
    );
  };

  const handleClearAllData = () => {
    const ts = nowTimestamp();
    setLastUpdated(ts);
    setSelectedVehicleId('');

    void clearAllFleetInFirestore(
      SHARED_WORKSPACE_ID,
      rawVehicles.map((v) => v.id),
      documents.map((d) => d.id),
      evidences.map((e) => e.vehicleId),
      ts,
      true
    ).catch(captureAsyncError);
  };

  const handleLoadDefaultFleet = () => {
    const ts = nowTimestamp();
    setLastUpdated(ts);

    void loadDefaultFleetToFirestore(
      SHARED_WORKSPACE_ID,
      ts,
      rawVehicles,
      documents,
      evidences
    ).catch(captureAsyncError);
  };

  const handleUpdateLegalizedDoc = (id: string, patch: Partial<LegalizedDocumentRecord>) => {
    const ts = nowTimestamp();
    setLastUpdated(ts);
    const existing = legalizedDocs.find((d) => d.id === id);
    if (!existing) return;

    void updateLegalizedDocInFirestore(existing, patch, SHARED_WORKSPACE_ID, ts).catch(
      captureAsyncError
    );
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

    for (const item of remainingToAdd) {
      void addLegalizedDocInFirestore(item, SHARED_WORKSPACE_ID, ts).catch(captureAsyncError);
    }
  };

  const handleDeleteLegalizedDoc = (id: string) => {
    const ts = nowTimestamp();
    setLastUpdated(ts);

    void deleteLegalizedDocInFirestore(id, SHARED_WORKSPACE_ID, ts).catch(captureAsyncError);
  };

  const handleAddComplianceChecks = (items: ComplianceCheckRecord[]) => {
    if (items.length === 0) return;
    const ts = nowTimestamp();
    setLastUpdated(ts);

    void addComplianceChecksInFirestore(items, SHARED_WORKSPACE_ID, ts).catch(captureAsyncError);
  };

  const handleUpdateComplianceCheck = (
    id: string,
    patch: Partial<ComplianceCheckRecord>
  ) => {
    const existing = complianceChecks.find((r) => r.id === id);
    if (!existing) return;
    const ts = nowTimestamp();
    setLastUpdated(ts);

    void updateComplianceCheckInFirestore(existing, patch, SHARED_WORKSPACE_ID, ts).catch(
      captureAsyncError
    );
  };

  const handleDeleteComplianceCheck = (id: string) => {
    const ts = nowTimestamp();
    setLastUpdated(ts);

    void deleteComplianceCheckInFirestore(id, SHARED_WORKSPACE_ID, ts).catch(captureAsyncError);
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
                Carregando dados do banco de dados...
              </p>
            </div>
          ) : (
            <>
              {activeSection === 'bloco-1' && (
                <Bloco1HubView
                  onSelectSection={setActiveSection}
                  legalizedCount={legalized111Docs.length}
                  vehiclesCount={vehicles.length}
                  sanitaryCount={sanitaryLaudoDocs.length}
                  complianceCount={complianceChecks.length}
                />
              )}

              {activeSection === 'documentos-legalizados' && (
                <LegalizedDocumentsView
                  records={legalized111Docs}
                  vehicles={vehicles}
                  onAddRecords={handleAddLegalizedDocs}
                  onUpdateRecord={handleUpdateLegalizedDoc}
                  onDeleteRecord={handleDeleteLegalizedDoc}
                />
              )}

              {activeSection === 'processo-garantia' && (
                <ProcessGuaranteeView />
              )}

              {activeSection === 'laudo-vigilancia' && (
                <SanitaryLaudoView
                  records={sanitaryLaudoDocs}
                  vehicles={vehicles}
                  onAddRecords={handleAddLegalizedDocs}
                  onUpdateRecord={handleUpdateLegalizedDoc}
                  onDeleteRecord={handleDeleteLegalizedDoc}
                />
              )}

              {activeSection === 'check-conformidade' && (
                <ComplianceCheckView
                  records={complianceChecks}
                  vehicles={vehicles}
                  onAddRecords={handleAddComplianceChecks}
                  onUpdateRecord={handleUpdateComplianceCheck}
                  onDeleteRecord={handleDeleteComplianceCheck}
                />
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
