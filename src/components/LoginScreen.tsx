import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { PauBrasilTreeMark } from './Sidebar';
import fleetTruckImg from '../assets/images/fleet_delivery_truck_1795777643031.jpg';

interface LoginScreenProps {
  onLogin: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [matricula, setMatricula] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [bgImgError, setBgImgError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedMatricula = matricula.trim().toUpperCase();
    if (!normalizedMatricula || !password) {
      setNotice(null);
      setErrorMsg('Por favor, preencha a matrícula e a senha para acessar.');
      return;
    }
    if (normalizedMatricula !== 'G1009' || password !== 'Frota01') {
      setNotice(null);
      setErrorMsg('Matrícula ou senha inválidas. Verifique seus dados e tente novamente.');
      return;
    }
    setErrorMsg(null);
    setNotice(null);
    onLogin();
  };

  const handleSupport = () => {
    setErrorMsg(null);
    setNotice('Atendimento ao suporte Pau Brasil disponível pelo canal interno da equipe.');
  };

  const handleForgot = () => {
    setErrorMsg(null);
    setNotice(
      matricula.trim()
        ? `Solicitação de recuperação registrada para a matrícula ${matricula.trim().toUpperCase()}.`
        : 'Informe sua matrícula acima ou procure a gestão de frota para redefinir a senha.'
    );
  };

  return (
    <div className="min-h-screen w-full bg-[#ECEFF4] flex items-center justify-center p-3 sm:p-5">
      <div className="w-full max-w-[820px] rounded-2xl bg-white shadow-[0_18px_42px_rgba(15,23,42,0.11)] border border-slate-200/80 p-3.5 sm:p-4 lg:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-stretch">
        {/* Left Form Section */}
        <div className="lg:col-span-5 px-2 sm:px-3 py-2 sm:py-3 flex flex-col justify-center">
          <div className="w-full max-w-[300px] mx-auto">
            {/* Platform Brand Header */}
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-lg bg-[#001A6E] flex items-center justify-center shadow-sm shrink-0">
                <PauBrasilTreeMark className="w-5 h-5" />
              </div>
              <div className="leading-tight">
                <div className="text-sm tracking-[0.14em] text-[#001A6E]">
                  <span className="font-light">PAU</span>
                  <span className="font-extrabold">BRASIL</span>
                </div>
                <p className="text-[10px] font-semibold text-slate-500 tracking-wide">
                  distribuidora ambev
                </p>
              </div>
            </div>

            <div className="space-y-0.5 mb-4">
              <h1 className="font-display text-xl font-bold text-slate-900 tracking-tight">
                Entrar
              </h1>
              <p className="text-xs text-slate-600">
                Insira seus Dados para acessar a Plataforma.
              </p>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="mb-3.5 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-[11px] font-medium text-red-700"
              >
                {errorMsg}
              </div>
            )}

            {notice && (
              <div className="mb-3.5 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-[11px] font-medium text-[#001A6E]">
                {notice}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative pt-1">
                <label
                  htmlFor="login-matricula"
                  className="absolute -top-1 left-2.5 px-1 bg-white text-[10px] font-medium text-slate-500 z-10"
                >
                  Matrícula*
                </label>
                <input
                  id="login-matricula"
                  type="text"
                  autoComplete="username"
                  value={matricula}
                  onChange={(e) => {
                    setMatricula(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                    if (notice) setNotice(null);
                  }}
                  placeholder="Digite sua Matrícula"
                  className="w-full h-10 px-3.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#001A6E] focus:ring-2 focus:ring-[#001A6E]/10 focus:outline-none transition-all"
                />
              </div>

              <div className="relative pt-1">
                <label
                  htmlFor="login-password"
                  className="absolute -top-1 left-2.5 px-1 bg-white text-[10px] font-medium text-slate-500 z-10"
                >
                  Senha*
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                      if (notice) setNotice(null);
                    }}
                    placeholder="Digite a sua Senha"
                    className="w-full h-10 pl-3.5 pr-10 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#001A6E] focus:ring-2 focus:ring-[#001A6E]/10 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-700 hover:text-[#001A6E] cursor-pointer"
                  >
                    {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-10 rounded-lg bg-[#001A6E] hover:bg-[#0B3C7D] text-white text-xs font-semibold shadow-md shadow-[#001A6E]/20 transition-all cursor-pointer"
              >
                Acessar Conta
              </button>
            </form>

            <div className="my-3.5 border-t border-slate-200" />

            <div className="space-y-2.5 text-center">
              <button
                type="button"
                onClick={handleForgot}
                className="w-full h-9 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-medium transition-colors cursor-pointer"
              >
                Esqueci a Senha
              </button>
              <div>
                <button
                  type="button"
                  onClick={handleSupport}
                  className="text-xs font-semibold text-slate-800 hover:text-[#001A6E] hover:underline cursor-pointer"
                >
                  Conversar com o Suporte
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Visual Brand Panel with Fleet Truck Photo */}
        <div className="lg:col-span-7 relative min-h-[300px] sm:min-h-[380px] rounded-xl overflow-hidden bg-[#001A6E] p-5 sm:p-6 flex flex-col justify-between text-white">
          {!bgImgError && (
            <img
              src={fleetTruckImg}
              alt="Caminhão da frota Pau Brasil Distribuidora Ambev em operação logística"
              referrerPolicy="no-referrer"
              onError={() => setBgImgError(true)}
              className="absolute inset-0 w-full h-full object-cover object-[72%_center] pointer-events-none select-none"
            />
          )}

          {/* Measured directional contrast scrims keeping truck sharp on the right and text crisp on the left */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-[#001A6E]/92 via-[#001A6E]/68 to-[#001A6E]/20 pointer-events-none"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[#00124D]/85 via-transparent to-[#001A6E]/55 pointer-events-none"
          />

          {/* Top header bar */}
          <div className="relative z-10 flex items-center justify-between text-[10px] text-blue-100/90">
            <span className="font-semibold tracking-wider uppercase">
              Portal Operacional de Frota
            </span>
            <span className="font-mono tabular-nums">Brejo · PB</span>
          </div>

          {/* Center-left brand & fleet message */}
          <div className="relative z-10 my-4 flex flex-col items-start gap-4 max-w-sm">
            <div className="flex flex-col items-start">
              <PauBrasilTreeMark className="w-10 h-10 mb-1.5 drop-shadow-md" />
              <div className="text-lg tracking-[0.16em] text-white leading-none drop-shadow-sm">
                <span className="font-light">PAU</span>
                <span className="font-extrabold">BRASIL</span>
              </div>
              <span className="text-xs font-semibold text-blue-100 mt-0.5 tracking-wide">
                distribuidora ambev
              </span>
            </div>

            <div className="space-y-2">
              <div className="w-14 h-1 rounded-full bg-emerald-400" />
              <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight leading-[1.15] [text-wrap:balance] drop-shadow-sm">
                Disponibilidade de Frota Pau Brasil
              </h2>
            </div>
          </div>

          <div className="relative z-10 pt-3 border-t border-white/20 flex items-center justify-between text-[10px] text-blue-100/85">
            <span>Pau Brasil Distribuidora Ambev</span>
            <span>Padrão DPO · Gestão de Frota</span>
          </div>
        </div>
      </div>
    </div>
  );
};
