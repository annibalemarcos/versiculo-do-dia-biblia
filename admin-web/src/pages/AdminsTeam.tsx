import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { AdminUserItem, RoleItem } from '../types';
import {
  ShieldCheck,
  UserPlus,
  Lock,
  Mail,
  User,
  CheckCircle2,
  AlertCircle,
  X,
  Key,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';

export const AdminsTeam: React.FC = () => {
  const { user } = useAuth();

  const [admins, setAdmins] = useState<AdminUserItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formSelectedRoles, setFormSelectedRoles] = useState<string[]>(['editor']);
  const [formIsSuperAdmin, setFormIsSuperAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [adminsRes, rolesRes] = await Promise.all([
        api.get<any>('/admin/admins'),
        api.get<any>('/admin/admins/roles'),
      ]);

      // Normalize admins list
      let adminsList: AdminUserItem[] = [];
      if (adminsRes?.success && adminsRes?.data) {
        if (Array.isArray(adminsRes.data)) {
          adminsList = adminsRes.data;
        } else if (Array.isArray((adminsRes.data as any).admins)) {
          adminsList = (adminsRes.data as any).admins;
        } else if (Array.isArray((adminsRes.data as any).data)) {
          adminsList = (adminsRes.data as any).data;
        }
      } else if (Array.isArray(adminsRes)) {
        adminsList = adminsRes;
      }
      setAdmins(Array.isArray(adminsList) ? adminsList : []);

      // Normalize roles list
      let rolesList: RoleItem[] = [];
      if (rolesRes?.success && rolesRes?.data) {
        if (Array.isArray(rolesRes.data)) {
          rolesList = rolesRes.data;
        } else if (Array.isArray((rolesRes.data as any).roles)) {
          rolesList = (rolesRes.data as any).roles;
        } else if (Array.isArray((rolesRes.data as any).data)) {
          rolesList = (rolesRes.data as any).data;
        }
      } else if (Array.isArray(rolesRes)) {
        rolesList = rolesRes;
      }
      setRoles(Array.isArray(rolesList) ? rolesList : []);

      if (adminsRes && !adminsRes.success && adminsRes.error) {
        setError(adminsRes.error.message || 'Erro ao carregar administradores.');
      } else if (rolesRes && !rolesRes.success && rolesRes.error) {
        setError(rolesRes.error.message || 'Erro ao carregar perfis de acesso.');
      }
    } catch (err: any) {
      setError(err?.message || 'Falha de comunicação ao carregar a equipe.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const selectedRoles = [...formSelectedRoles];
    if (formIsSuperAdmin && !selectedRoles.includes('super_admin')) {
      selectedRoles.push('super_admin');
    }

    const payload = {
      email: formEmail,
      name: formName,
      password: formPassword,
      roles: selectedRoles,
      is_active: true,
    };

    const res = await api.post('/admin/admins', payload);
    setSaving(false);

    if (res.success) {
      setModalOpen(false);
      setToastMessage('Novo administrador cadastrado com sucesso!');
      setTimeout(() => setToastMessage(null), 3000);
      setFormEmail('');
      setFormName('');
      setFormPassword('');
      setFormSelectedRoles(['editor']);
      setFormIsSuperAdmin(false);
      fetchData();
    } else {
      alert(res.error?.message || 'Erro ao cadastrar administrador');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-emerald-950 border border-emerald-800 text-emerald-300 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="bg-rose-950/60 border border-rose-800/80 rounded-2xl p-4 flex items-center justify-between gap-3 text-rose-300 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-900 text-white font-semibold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Tentar Novamente</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Equipe Administrativa & Perfis RBAC
          </h2>
          <p className="text-xs text-slate-400">
            Controle de acesso granular baseado em papéis (Role-Based Access Control)
          </p>
        </div>

        {user?.is_super_admin && (
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-400 text-slate-950 px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-brand-500/20 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Adicionar Administrador</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Admins List */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase text-white tracking-wider">
              Membros da Equipe ({Array.isArray(admins) ? admins.length : 0})
            </h3>
          </div>

          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between gap-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800" />
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-800 rounded w-32" />
                      <div className="h-3 bg-slate-800 rounded w-48" />
                    </div>
                  </div>
                  <div className="h-5 bg-slate-800 rounded w-16" />
                </div>
              ))}
            </div>
          ) : Array.isArray(admins) && admins.length > 0 ? (
            <div className="divide-y divide-slate-800/60">
              {admins.map((adm) => (
                <div key={adm.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-white text-xs border border-slate-700">
                      {adm.name ? adm.name.substring(0, 2).toUpperCase() : 'AD'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{adm.name || 'Sem Nome'}</span>
                        {adm.is_super_admin && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-950 text-brand-400 border border-brand-800/60">
                            Super Admin
                          </span>
                        )}
                        {!adm.is_active && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-400 border border-rose-800/60">
                            Inativo
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">{adm.email}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 justify-end max-w-xs">
                    {Array.isArray(adm.roles) && adm.roles.length > 0 ? (
                      adm.roles.map((r) => (
                        <span
                          key={r}
                          className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-mono"
                        >
                          {r}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-500 italic">Sem perfil</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500">
              Nenhum administrador encontrado no sistema.
            </div>
          )}
        </div>

        {/* Roles & Permissions Matrix */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase text-white tracking-wider flex items-center gap-2">
            <Key className="w-4 h-4 text-brand-400" />
            <span>Papéis Definidos no Sistema</span>
          </h3>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 animate-pulse">
                  <div className="h-4 bg-slate-800 rounded w-1/3" />
                  <div className="h-3 bg-slate-800 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : Array.isArray(roles) && roles.length > 0 ? (
            <div className="space-y-3">
              {roles.map((r) => (
                <div key={r.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-white capitalize">{r.name}</span>
                    <span className="text-[10px] font-mono text-slate-500">ID: {r.id}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{r.description}</p>
                  <div className="text-[10px] text-brand-400 pt-1">
                    Permissões vinculadas: {Array.isArray(r.permissions) ? r.permissions.length : 0}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-slate-500">
              Nenhum papel RBAC configurado no sistema.
            </div>
          )}
        </div>
      </div>

      {/* New Admin Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Cadastrar Novo Administrador</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Pr. Carlos Eduardo"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="carlos@versiculododia.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  Senha Inicial
                </label>
                <input
                  type="password"
                  required
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1.5">
                  Atribuir Papéis (RBAC)
                </label>
                {Array.isArray(roles) && roles.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {roles.map((r) => {
                      const isSelected = formSelectedRoles.includes(r.id);
                      return (
                        <label
                          key={r.id}
                          className="flex items-center gap-2 p-2 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-300 cursor-pointer hover:border-slate-700"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormSelectedRoles([...formSelectedRoles, r.id]);
                              } else {
                                setFormSelectedRoles(formSelectedRoles.filter((x) => x !== r.id));
                              }
                            }}
                            className="rounded bg-slate-900 border-slate-700 text-brand-500"
                          />
                          <span className="font-bold capitalize">{r.name}</span>
                          <span className="text-[10px] text-slate-500">— {r.description}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 italic p-2 bg-slate-950 rounded-lg border border-slate-800">
                    Nenhum papel disponível para seleção.
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-brand-500 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-brand-500/20"
                >
                  {saving ? 'Cadastrando...' : 'Cadastrar Membro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

