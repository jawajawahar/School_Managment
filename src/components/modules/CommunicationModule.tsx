import React, { useState } from 'react';
import { Send, CheckCheck, Users, Bell, AlertTriangle, Trash2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { UserRole } from '../../types';
import { PageHeader } from '../ui/PageHeader';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { FormField, Input, Select, Textarea } from '../ui/FormField';
import { EmptyState } from '../ui/EmptyState';
import { IconTile } from '../ui/IconTile';

type AudienceMode = 'all' | 'role' | 'class';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'teacher', label: 'Teachers' },
  { value: 'parent', label: 'Parents' },
  { value: 'student', label: 'Students' },
  { value: 'staff', label: 'Support staff' },
];

export const CommunicationModule: React.FC = () => {
  const { announcements, classes, createAnnouncement, deleteAnnouncement, currentUser, activeRole, notifications } = useData();
  const canCompose = ['principal', 'vice_principal', 'admin', 'teacher', 'staff'].includes(activeRole);
  const canDeclareEmergency = ['principal', 'vice_principal', 'admin'].includes(activeRole);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audienceMode, setAudienceMode] = useState<AudienceMode>('all');
  const [audienceRole, setAudienceRole] = useState<UserRole>('teacher');
  const [targetClassId, setTargetClassId] = useState(classes[0]?.id || '');
  const [isEmergency, setIsEmergency] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const isPrincipal =
    activeRole === 'principal' ||
    currentUser?.role === 'principal' ||
    currentUser?.id === 'user-principal-1' ||
    currentUser?.fullName?.toLowerCase().includes('principal');

  const myNotifications = notifications
    .filter(
      (n) =>
        n.recipientId === currentUser?.id ||
        n.recipientId === 'all' ||
        (isPrincipal &&
          (n.recipientId === 'user-principal-1' ||
            n.recipientId === 'principal' ||
            n.recipientId?.toLowerCase().includes('principal') ||
            n.title.toLowerCase().includes('guardian meeting') ||
            n.title.toLowerCase().includes('leave') ||
            n.title.toLowerCase().includes('requisition') ||
            n.title.toLowerCase().includes('admission')))
    )
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

  const audienceLabel = (ann: (typeof announcements)[number]) =>
    ann.audienceClassId
      ? (() => {
          const cls = classes.find((c) => c.id === ann.audienceClassId);
          return cls ? `${cls.grade} - Section ${cls.section}` : 'Specific class';
        })()
      : ann.audienceRole && ann.audienceRole !== 'all'
      ? ROLE_OPTIONS.find((r) => r.value === ann.audienceRole)?.label || ann.audienceRole
      : 'School-wide (all)';

  const handleComposerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) return;

    createAnnouncement(
      title,
      body,
      audienceMode === 'role' ? audienceRole : 'all',
      audienceMode === 'class' ? targetClassId : undefined,
      isEmergency
    );
    setTitle('');
    setBody('');
    setIsEmergency(false);
    setSentSuccess(true);
    setTimeout(() => setSentSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow={<Badge tone="brand">Communication & broadcast</Badge>}
        title="Announcements & notifications"
        description="Broadcast targeted announcements and track your notification inbox."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {canCompose ? (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <IconTile icon={Send} tone="brand" />
                <CardTitle>Compose announcement</CardTitle>
              </div>
            </CardHeader>

            {sentSuccess && (
              <div className="p-3 bg-success-tint text-success text-sm rounded-lg flex items-center gap-2 mb-4">
                <CheckCheck className="w-4 h-4" /> Announcement broadcast — in-app notification sent to the selected audience.
              </div>
            )}

            <form onSubmit={handleComposerSubmit} className="space-y-3.5">
              <FormField label="Target audience">
                <div className="grid grid-cols-3 gap-1.5">
                  {(['all', 'role', 'class'] as AudienceMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setAudienceMode(mode)}
                      className={`py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        audienceMode === mode ? 'bg-brand text-white border-brand' : 'bg-surface-muted text-ink-muted border-border hover:text-ink'
                      }`}
                    >
                      {mode === 'all' ? 'Everyone' : mode === 'role' ? 'By role' : 'Specific class'}
                    </button>
                  ))}
                </div>
              </FormField>

              {audienceMode === 'role' && (
                <FormField label="Select role">
                  <Select value={audienceRole} onChange={(e) => setAudienceRole(e.target.value as UserRole)}>
                    {ROLE_OPTIONS.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
                  </Select>
                </FormField>
              )}

              {audienceMode === 'class' && (
                <FormField label="Select class">
                  <Select value={targetClassId} onChange={(e) => setTargetClassId(e.target.value)}>
                    {classes.map((c) => (<option key={c.id} value={c.id}>{c.grade} - Section {c.section}</option>))}
                  </Select>
                </FormField>
              )}

              <FormField label="Headline title" required>
                <Input type="text" placeholder="e.g. End of Term Examination Schedule" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </FormField>

              <FormField label="Message body" required>
                <Textarea rows={5} placeholder="Write message contents..." value={body} onChange={(e) => setBody(e.target.value)} required />
              </FormField>

              {canDeclareEmergency && (
                <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                  <input type="checkbox" checked={isEmergency} onChange={(e) => setIsEmergency(e.target.checked)} />
                  <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-danger" /> Mark as emergency broadcast</span>
                </label>
              )}

              <Button type="submit" variant={isEmergency ? 'danger' : 'primary'} className="w-full justify-center">
                <Send className="w-4 h-4" /> {isEmergency ? 'Send emergency broadcast' : 'Broadcast announcement'}
              </Button>
            </form>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <IconTile icon={Bell} tone="brand" />
                <CardTitle>My notifications</CardTitle>
              </div>
            </CardHeader>

            {myNotifications.length === 0 ? (
              <EmptyState icon={Bell} title="No notifications yet" description="School announcements addressed to you will appear here." compact />
            ) : (
              <div className="space-y-3">
                {myNotifications.map((n) => (
                  <div key={n.id} className="p-3 bg-surface-muted border border-border rounded-lg">
                    <div className="flex items-center justify-between text-xs text-ink-faint mb-1">
                      <span className="font-semibold text-ink-muted">{n.title}</span>
                      <span>{new Date(n.sentAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-ink leading-snug">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Announcements Ledger */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>School announcements</CardTitle>
          </CardHeader>

          {announcements.length === 0 ? (
            <EmptyState icon={Send} title="No announcements yet" description="Broadcast announcements will appear here for everyone to read." compact />
          ) : (
            <div className="space-y-3.5">
              {[...announcements]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((ann) => (
                <div key={ann.id} className={`p-4 rounded-xl border-l-4 ${ann.isEmergency ? 'bg-danger-tint border-danger' : 'bg-surface-muted border-brand'}`}>
                  <div className="flex items-center justify-between text-xs text-ink-faint mb-1">
                    <span className="font-semibold text-ink-muted flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {ann.createdBy}
                    </span>
                    <div className="flex items-center gap-2">
                      <span>{new Date(ann.createdAt).toLocaleString()}</span>
                      {(['principal', 'vice_principal', 'admin'].includes(activeRole) || ann.createdBy === currentUser?.fullName) && (
                        <button
                          type="button"
                          onClick={() => deleteAnnouncement(ann.id)}
                          title="Delete announcement"
                          className="p-1 text-ink-faint hover:text-danger hover:bg-danger-tint rounded-md transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <h4 className="font-display font-semibold text-base text-ink mb-1 flex items-center gap-2">
                    {ann.isEmergency && <Badge tone="danger"><AlertTriangle className="w-3 h-3" /> Emergency</Badge>}
                    {ann.title}
                  </h4>
                  <p className="text-sm text-ink-muted leading-relaxed">{ann.body}</p>
                  <div className="mt-3 pt-2.5 border-t border-border/60">
                    <Badge tone="neutral">Audience: {audienceLabel(ann)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
