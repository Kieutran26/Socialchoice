import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    UsersThree,
    UserPlus,
    Copy,
    Check,
    Trash,
    ShieldCheck,
    Crown,
    CheckCircle,
    Clock,
    ArrowUpRight,
    CaretDown,
    LockKey,
    SlidersHorizontal,
    UserSwitch,
} from '@phosphor-icons/react';
import { useAuth } from '@/lib/AuthContext';
import { useWorkspace } from '@/lib/workspace-context';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    TEAM_ROLES,
    getRoleMeta,
    getActiveSubscription,
    getTeamMembers,
    saveTeamMembers,
    getTeamSettings,
    saveTeamSettings,
    createInviteToken,
    buildInviteUrl,
    getActiveMember,
    setActiveMember,
    clearActiveMember,
} from '@/lib/team-seats';

export default function TeamSeatsPanel() {
    const { user } = useAuth();
    const { brands } = useWorkspace();
    const { language } = useTranslation();
    const { toast } = useToast();
    const isEn = language === 'en';

    const [subscription, setSubscription] = useState(getActiveSubscription);
    const [members, setMembers] = useState(getTeamMembers);
    const [teamSettings, setTeamSettings] = useState(getTeamSettings);

    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteName, setInviteName] = useState('');
    const [inviteRole, setInviteRole] = useState('editor');
    const [inviteBrandScope, setInviteBrandScope] = useState('all');
    const [inviteError, setInviteError] = useState('');

    const [copiedId, setCopiedId] = useState('');
    const [removeTarget, setRemoveTarget] = useState(null);
    const [activeMember, setActiveLocalMember] = useState(getActiveMember);

    useEffect(() => {
        const sync = () => {
            setSubscription(getActiveSubscription());
            setMembers(getTeamMembers());
            setTeamSettings(getTeamSettings());
            setActiveLocalMember(getActiveMember());
        };
        window.addEventListener('storage', sync);
        window.addEventListener('socialchoice:subscription', sync);
        window.addEventListener('socialchoice:team', sync);
        window.addEventListener('socialchoice:auth', sync);
        return () => {
            window.removeEventListener('storage', sync);
            window.removeEventListener('socialchoice:subscription', sync);
            window.removeEventListener('socialchoice:team', sync);
            window.removeEventListener('socialchoice:auth', sync);
        };
    }, []);

    const handleSwitchToMember = (member) => {
        const payload = {
            id: member.id,
            name: member.name,
            email: member.email,
            role: member.role || 'editor',
            brandScope: member.brandScope || 'all',
            isTeamMember: true,
            workspaceId: 'main',
        };
        setActiveMember(payload);
        setActiveLocalMember(payload);
        toast({
            title: isEn ? `Switched role to ${member.name} (${member.role})` : `Đang xem dưới quyền ${member.name} (${member.role})`,
            description: isEn ? 'Workspace UI and permissions are now filtered to this member role.' : 'Quyền thao tác và giao diện đã được chuyển sang vai trò này.',
        });
    };

    const handleRevertToOwner = () => {
        clearActiveMember();
        setActiveLocalMember(null);
        toast({
            title: isEn ? 'Reverted to Workspace Owner' : 'Đã quay lại quyền Chủ sở hữu (Owner)',
        });
    };

    const maxSeats = Math.max(1, Number(subscription?.quotas?.seats || 1));
    const usedSeats = 1 + members.length; // 1 = Workspace Owner
    const remainingSeats = Math.max(0, maxSeats - usedSeats);
    const seatUsagePct = Math.min(100, Math.round((usedSeats / maxSeats) * 100));
    const isAtSeatLimit = usedSeats >= maxSeats;

    const ownerRecord = useMemo(
        () => ({
            id: 'workspace-owner',
            name: user?.full_name || subscription?.customerName || (isEn ? 'Workspace Owner' : 'Chủ sở hữu Workspace'),
            email: user?.email || subscription?.email || 'owner@socialchoice.local',
            role: 'owner',
            brandScope: 'all',
            status: 'active',
            isOwner: true,
        }),
        [user, subscription, isEn]
    );

    const openInviteDialog = () => {
        setInviteError('');
        setInviteEmail('');
        setInviteName('');
        setInviteRole('editor');
        setInviteBrandScope('all');
        setInviteOpen(true);
    };

    const handleInviteSubmit = (e) => {
        e.preventDefault();
        setInviteError('');

        if (isAtSeatLimit) {
            setInviteError(
                isEn
                    ? `Seat limit reached (${usedSeats}/${maxSeats}). Upgrade your plan to add more members.`
                    : `Đã dùng hết số ghế (${usedSeats}/${maxSeats}). Vui lòng nâng cấp gói để mời thêm thành viên.`
            );
            return;
        }

        const cleanEmail = inviteEmail.trim().toLowerCase();
        if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            setInviteError(isEn ? 'Please enter a valid email address.' : 'Vui lòng nhập địa chỉ email hợp lệ.');
            return;
        }

        if (
            cleanEmail === ownerRecord.email.toLowerCase() ||
            members.some((m) => m.email.toLowerCase() === cleanEmail)
        ) {
            setInviteError(
                isEn
                    ? 'This email already occupies a seat in your workspace.'
                    : 'Email này đã được cấp ghế trong workspace của bạn.'
            );
            return;
        }

        const token = createInviteToken();
        const nextMember = {
            id: `seat-${Date.now()}`,
            name: inviteName.trim() || cleanEmail.split('@')[0],
            email: cleanEmail,
            role: inviteRole,
            brandScope: inviteBrandScope,
            status: 'pending',
            inviteToken: token,
            inviteUrl: buildInviteUrl(token, cleanEmail),
            invitedAt: new Date().toISOString(),
        };

        const updated = [...members, nextMember];
        setMembers(updated);
        saveTeamMembers(updated);
        setInviteOpen(false);

        toast({
            title: isEn ? 'Team seat assigned & invite created' : 'Đã cấp ghế & tạo lời mời thành công',
            description: isEn
                ? `Invite link ready for ${cleanEmail}.`
                : `Đã giữ 1 ghế cho ${cleanEmail}. Bạn có thể sao chép link mời gửi ngay cho thành viên.`,
        });
    };

    const handleRoleChange = (memberId, newRole) => {
        const updated = members.map((m) => (m.id === memberId ? { ...m, role: newRole } : m));
        setMembers(updated);
        saveTeamMembers(updated);
        toast({
            title: isEn ? 'Member role updated' : 'Đã cập nhật vai trò thành viên',
        });
    };

    const handleScopeChange = (memberId, newScope) => {
        const updated = members.map((m) => (m.id === memberId ? { ...m, brandScope: newScope } : m));
        setMembers(updated);
        saveTeamMembers(updated);
        toast({
            title: isEn ? 'Brand access updated' : 'Đã cập nhật phạm vi thương hiệu',
        });
    };

    const handleActivateDemoMember = (memberId) => {
        const updated = members.map((m) =>
            m.id === memberId
                ? { ...m, status: 'active', acceptedAt: new Date().toISOString() }
                : m
        );
        setMembers(updated);
        saveTeamMembers(updated);
        toast({
            title: isEn ? 'Member marked as active' : 'Thành viên đã kích hoạt ghế',
        });
    };

    const handleCopyInvite = (member) => {
        const url = member.inviteUrl || buildInviteUrl(member.inviteToken || 'INV-TEAM', member.email);
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url);
            setCopiedId(member.id);
            setTimeout(() => setCopiedId(''), 2000);
            toast({
                title: isEn ? 'Invite link copied' : 'Đã sao chép link mời tham gia Team',
            });
        }
    };

    const confirmRemoveMember = () => {
        if (!removeTarget) return;
        const updated = members.filter((m) => m.id !== removeTarget.id);
        setMembers(updated);
        saveTeamMembers(updated);
        toast({
            title: isEn ? 'Seat released' : 'Đã thu hồi ghế thành viên',
            description: isEn
                ? `${removeTarget.email} was removed and 1 seat is now free.`
                : `Đã gỡ ${removeTarget.email} và giải phóng 1 ghế trống.`,
        });
        setRemoveTarget(null);
    };

    const toggleApprovalSetting = (key) => {
        const next = { ...teamSettings, [key]: !teamSettings[key] };
        setTeamSettings(next);
        saveTeamSettings(next);
        toast({
            title: isEn ? 'Approval workflow updated' : 'Đã lưu cấu hình duyệt bài nhóm',
        });
    };

    const brandLabel = (scope) => {
        if (!scope || scope === 'all') return isEn ? 'All brands' : 'Tất cả thương hiệu';
        const found = brands.find((b) => b.id === scope);
        return found ? found.name : scope;
    };

    return (
        <div className="space-y-5">
            {/* Active Test Mode Banner */}
            {activeMember && (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3.5 flex flex-wrap items-center justify-between gap-3 text-amber-950 shadow-xs">
                    <div className="flex items-center gap-2.5">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-amber-400 font-bold text-zinc-950 text-xs shadow-xs">
                            ⚡
                        </span>
                        <div className="text-xs">
                            <span className="font-bold">
                                {isEn ? 'Previewing workspace as:' : 'Đang thử nghiệm workspace dưới quyền:'}
                            </span>{' '}
                            <span className="font-bold underline">
                                {activeMember.name} ({activeMember.role})
                            </span>
                            {activeMember.brandScope && activeMember.brandScope !== 'all' && (
                                <span className="ml-1 text-amber-800">
                                    ({isEn ? `Scope: Brand #${activeMember.brandScope}` : `Phạm vi: Brand #${activeMember.brandScope}`})
                                </span>
                            )}
                        </div>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs bg-white text-zinc-900 border-amber-300 hover:bg-amber-100 cursor-pointer"
                        onClick={handleRevertToOwner}
                    >
                        <UserSwitch size={13} className="mr-1" />
                        {isEn ? 'Revert to Owner' : 'Quay lại quyền Owner'}
                    </Button>
                </div>
            )}

            {/* 1. Seat Capacity & Plan Status Banner */}
            <section className="panel p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/20 text-brand-ink border border-brand-dark/30">
                            <UsersThree size={18} weight="duotone" />
                        </span>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-[15px] font-semibold text-foreground">
                                    {isEn ? 'Team Seats & Access Control' : 'Quản lý Ghế thành viên (Team Seats)'}
                                </h2>
                                <StatusBadge tone={isAtSeatLimit ? 'warn' : 'success'}>
                                    {usedSeats} / {maxSeats} {isEn ? 'seats used' : 'ghế đã dùng'}
                                </StatusBadge>
                            </div>
                            <p className="label-xs text-muted-foreground mt-1">
                                {isEn
                                    ? `Active plan: ${subscription.planName}. Invite teammates, assign roles, and scope brand access.`
                                    : `Gói hiện tại: ${subscription.planName}. Mời thành viên, phân quyền duyệt bài và giới hạn thương hiệu phụ trách.`}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <Button variant="outline" size="sm" asChild>
                            <Link to="/pricing">
                                <span>{isEn ? 'Upgrade / Add seats' : 'Mua thêm ghế'}</span>
                                <ArrowUpRight size={14} />
                            </Link>
                        </Button>
                        <button
                            type="button"
                            className="btn-skew"
                            onClick={openInviteDialog}
                            disabled={isAtSeatLimit}
                            title={
                                isAtSeatLimit
                                    ? isEn
                                        ? 'No seats left in current plan'
                                        : 'Đã hết ghế trống trong gói hiện tại'
                                    : undefined
                            }
                        >
                            <UserPlus size={16} weight="duotone" />
                            <span>{isEn ? 'Invite member' : 'Mời thành viên'}</span>
                        </button>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted border border-border/60">
                        <div
                            className={`h-full transition-all duration-300 ${
                                isAtSeatLimit ? 'bg-amber-500' : 'bg-brand-dark'
                            }`}
                            style={{ width: `${seatUsagePct}%` }}
                        />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        <span>
                            {remainingSeats > 0
                                ? isEn
                                    ? `${remainingSeats} seat(s) available to assign.`
                                    : `Còn trống ${remainingSeats} ghế có thể mời thêm ngay.`
                                : isEn
                                    ? 'All seats in your current plan are occupied.'
                                    : 'Tất cả ghế trong gói hiện tại đã được sử dụng.'}
                        </span>
                        <span className="font-mono">
                            {subscription.planName} · {maxSeats} {isEn ? 'seats' : 'ghế'}
                        </span>
                    </div>
                </div>

                {isAtSeatLimit && (
                    <div
                        role="status"
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/70 bg-warnBg px-3.5 py-2.5 text-xs text-warnFg"
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <LockKey size={16} weight="duotone" className="shrink-0" />
                            <span className="font-medium">
                                {maxSeats === 1
                                    ? isEn
                                        ? 'Your current plan includes 1 personal seat. Upgrade to Professional (3 seats), Business (10 seats), or Custom Builder to invite teammates.'
                                        : 'Gói hiện tại chỉ gồm 1 ghế cá nhân. Hãy nâng cấp lên Professional (3 ghế), Business (10 ghế) hoặc Gói Tự Thiết Kế để mời thêm thành viên.'
                                    : isEn
                                        ? `You have used all ${maxSeats} seats. Remove an inactive member or add seats in Pricing.`
                                        : `Bạn đã dùng hết ${maxSeats}/${maxSeats} ghế. Thu hồi bớt ghế cũ hoặc mua thêm ghế tại trang Bảng giá.`}
                            </span>
                        </div>
                        <Link
                            to="/pricing"
                            className="shrink-0 inline-flex items-center gap-1 font-semibold underline underline-offset-2"
                        >
                            <span>{isEn ? 'View plans' : 'Nâng cấp ngay'}</span>
                            <ArrowUpRight size={13} />
                        </Link>
                    </div>
                )}
            </section>

            {/* 2. Members & Seats Table */}
            <section className="panel overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                    <div>
                        <h3 className="text-[15px] font-semibold text-foreground">
                            {isEn ? 'Workspace Members' : 'Danh sách thành viên & Ghế đang cấp'}
                        </h3>
                        <p className="label-xs text-muted-foreground mt-0.5">
                            {isEn
                                ? 'Manage roles and which brands each seat can access.'
                                : 'Chỉnh sửa vai trò và phạm vi thương hiệu cho từng thành viên.'}
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                <th className="p-3 pl-5">{isEn ? 'Member' : 'Thành viên'}</th>
                                <th className="p-3">{isEn ? 'Role' : 'Vai trò'}</th>
                                <th className="p-3">{isEn ? 'Brand Scope' : 'Phạm vi Brand'}</th>
                                <th className="p-3">{isEn ? 'Status' : 'Trạng thái'}</th>
                                <th className="p-3 pr-5 text-right">{isEn ? 'Actions' : 'Thao tác'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-xs">
                            {/* Owner Row */}
                            <tr className="hover:bg-muted/30 transition-colors">
                                <td className="p-3 pl-5">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-brand-ink font-bold text-xs">
                                            {ownerRecord.name.slice(0, 2).toUpperCase()}
                                        </span>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5 font-semibold text-foreground">
                                                <span className="truncate">{ownerRecord.name}</span>
                                                <Crown size={14} weight="fill" className="text-amber-500 shrink-0" />
                                            </div>
                                            <div className="text-[11px] text-muted-foreground truncate">
                                                {ownerRecord.email}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-3">
                                    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px] font-semibold text-foreground">
                                        <ShieldCheck size={13} weight="duotone" />
                                        {isEn ? 'Owner (Full)' : 'Chủ sở hữu (Owner)'}
                                    </span>
                                </td>
                                <td className="p-3 text-muted-foreground">
                                    {isEn ? 'All brands' : 'Tất cả thương hiệu'}
                                </td>
                                <td className="p-3">
                                    <StatusBadge tone="success">
                                        {isEn ? 'Active' : 'Đang hoạt động'}
                                    </StatusBadge>
                                </td>
                                <td className="p-3 pr-5 text-right text-[11px] text-muted-foreground">
                                    {isEn ? 'Seat #1 (Primary)' : 'Ghế mặc định #1'}
                                </td>
                            </tr>

                            {/* Invited / Active Members */}
                            {members.map((member) => (
                                <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="p-3 pl-5">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-foreground font-semibold text-xs border border-border">
                                                {(member.name || member.email).slice(0, 2).toUpperCase()}
                                            </span>
                                            <div className="min-w-0">
                                                <div className="font-semibold text-foreground truncate">
                                                    {member.name}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground truncate">
                                                    {member.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <div className="relative inline-block min-w-[165px]">
                                            <select
                                                aria-label={`${isEn ? 'Role for' : 'Vai trò cho'} ${member.email}`}
                                                value={member.role}
                                                onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                                className="h-8 w-full rounded-lg border border-input bg-card pl-2.5 pr-7 text-xs font-medium text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                                            >
                                                {TEAM_ROLES.map((r) => (
                                                    <option key={r.id} value={r.id}>
                                                        {isEn ? r.labelEn : r.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <CaretDown
                                                size={12}
                                                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                                            />
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <div className="relative inline-block min-w-[145px]">
                                            <select
                                                aria-label={`${isEn ? 'Brand scope for' : 'Phạm vi thương hiệu cho'} ${member.email}`}
                                                value={member.brandScope || 'all'}
                                                onChange={(e) => handleScopeChange(member.id, e.target.value)}
                                                className="h-8 w-full rounded-lg border border-input bg-card pl-2.5 pr-7 text-xs text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                                            >
                                                <option value="all">{isEn ? 'All brands' : 'Tất cả thương hiệu'}</option>
                                                {brands.map((b) => (
                                                    <option key={b.id} value={b.id}>
                                                        {b.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <CaretDown
                                                size={12}
                                                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                                            />
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        {member.status === 'active' ? (
                                            <StatusBadge tone="success">
                                                {isEn ? 'Active' : 'Đang hoạt động'}
                                            </StatusBadge>
                                        ) : (
                                            <StatusBadge tone="info">
                                                {isEn ? 'Pending invite' : 'Chờ xác nhận'}
                                            </StatusBadge>
                                        )}
                                    </td>
                                    <td className="p-3 pr-5">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                variant={activeMember?.id === member.id ? 'default' : 'ghost'}
                                                size="sm"
                                                className={`h-8 px-2 text-xs gap-1 cursor-pointer ${
                                                    activeMember?.id === member.id
                                                        ? 'bg-amber-400 hover:bg-amber-500 text-zinc-950 font-semibold'
                                                        : 'text-zinc-700 hover:bg-muted'
                                                }`}
                                                onClick={() => {
                                                    if (activeMember?.id === member.id) {
                                                        handleRevertToOwner();
                                                    } else {
                                                        handleSwitchToMember(member);
                                                    }
                                                }}
                                                title={
                                                    activeMember?.id === member.id
                                                        ? isEn ? 'Stop previewing' : 'Dừng xem thử vai trò'
                                                        : isEn ? 'Preview role permissions' : 'Xem thử quyền vai trò này'
                                                }
                                            >
                                                <UserSwitch size={13} weight="bold" />
                                                <span>
                                                    {activeMember?.id === member.id
                                                        ? isEn ? 'Testing' : 'Đang test'
                                                        : isEn ? 'Test role' : 'Test vai trò'}
                                                </span>
                                            </Button>

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-2 text-xs gap-1"
                                                onClick={() => handleCopyInvite(member)}
                                                title={isEn ? 'Copy invite link' : 'Sao chép link mời'}
                                            >
                                                {copiedId === member.id ? (
                                                    <>
                                                        <Check size={13} className="text-successFg" />
                                                        <span className="text-successFg">{isEn ? 'Copied' : 'Đã chép'}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy size={13} />
                                                        <span>{isEn ? 'Invite link' : 'Link mời'}</span>
                                                    </>
                                                )}
                                            </Button>

                                            {member.status !== 'active' && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 px-2 text-xs gap-1 text-foreground"
                                                    onClick={() => handleActivateDemoMember(member.id)}
                                                    title={isEn ? 'Mark as accepted' : 'Xác nhận đã tham gia'}
                                                >
                                                    <CheckCircle size={13} />
                                                    <span>{isEn ? 'Activate' : 'Kích hoạt'}</span>
                                                </Button>
                                            )}

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-2 text-xs text-dangerFg hover:text-dangerFg hover:bg-dangerBg"
                                                onClick={() => setRemoveTarget(member)}
                                                aria-label={`${isEn ? 'Remove' : 'Gỡ'} ${member.email}`}
                                            >
                                                <Trash size={14} />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {members.length === 0 && (
                    <div className="border-t border-border px-5 py-4 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2 bg-muted/20">
                        <span>
                            {isEn
                                ? 'No team members invited yet. Assign a seat above to collaborate on content and approvals.'
                                : 'Chưa có thành viên nào được mời. Nhấn "Mời thành viên" để phân quyền soạn bài và duyệt lịch đăng.'}
                        </span>
                        {remainingSeats > 0 && (
                            <Button variant="outline" size="sm" onClick={openInviteDialog}>
                                <UserPlus size={14} />
                                <span>{isEn ? 'Assign first seat' : 'Cấp ghế đầu tiên'}</span>
                            </Button>
                        )}
                    </div>
                )}
            </section>

            {/* 3. Approval Workflow & Role Permissions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <section className="panel p-5 space-y-4">
                    <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-foreground border border-border/60">
                            <SlidersHorizontal size={16} weight="duotone" />
                        </span>
                        <div>
                            <h3 className="text-[15px] font-semibold text-foreground">
                                {isEn ? 'Approval Workflow Rules' : 'Quy trình Duyệt bài nhóm (Approval)'}
                            </h3>
                            <p className="label-xs text-muted-foreground mt-0.5">
                                {isEn
                                    ? 'Control how Editor drafts move to scheduled publishing.'
                                    : 'Kiểm soát bài viết của Biên tập viên trước khi xuất bản lên MXH.'}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3 text-xs">
                        <label className="flex items-start justify-between gap-3 rounded-xl border border-border/80 bg-background p-3.5 cursor-pointer hover:bg-muted/20 transition-colors">
                            <div>
                                <div className="font-semibold text-foreground">
                                    {isEn
                                        ? 'Require Approver/Admin sign-off for Editors'
                                        : 'Bắt buộc Approver / Admin duyệt bài của Editor'}
                                </div>
                                <div className="label-xs text-muted-foreground mt-0.5">
                                    {isEn
                                        ? 'Posts created by Editors stay in Pending Approval until reviewed.'
                                        : 'Bài do Biên tập viên tạo sẽ ở trạng thái Chờ duyệt cho tới khi được phê duyệt.'}
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={!!teamSettings.requireApprovalForEditors}
                                onChange={() => toggleApprovalSetting('requireApprovalForEditors')}
                                className="mt-0.5 h-4 w-4 rounded border-input accent-brand-dark cursor-pointer"
                            />
                        </label>

                        <label className="flex items-start justify-between gap-3 rounded-xl border border-border/80 bg-background p-3.5 cursor-pointer hover:bg-muted/20 transition-colors">
                            <div>
                                <div className="font-semibold text-foreground">
                                    {isEn
                                        ? 'Notify Approvers when a post is submitted'
                                        : 'Thông báo cho Approver khi có bài mới gửi duyệt'}
                                </div>
                                <div className="label-xs text-muted-foreground mt-0.5">
                                    {isEn
                                        ? 'Send workspace and email alerts when drafts need review.'
                                        : 'Gửi thông báo ngay khi thành viên hoàn tất bản nháp và bấm Gửi duyệt.'}
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={!!teamSettings.notifyApproversOnSubmit}
                                onChange={() => toggleApprovalSetting('notifyApproversOnSubmit')}
                                className="mt-0.5 h-4 w-4 rounded border-input accent-brand-dark cursor-pointer"
                            />
                        </label>
                    </div>
                </section>

                <section className="panel p-5 space-y-3">
                    <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-foreground border border-border/60">
                            <ShieldCheck size={16} weight="duotone" />
                        </span>
                        <div>
                            <h3 className="text-[15px] font-semibold text-foreground">
                                {isEn ? 'Role Permissions' : 'Ma trận phân quyền 4 vai trò'}
                            </h3>
                            <p className="label-xs text-muted-foreground mt-0.5">
                                {isEn
                                    ? 'Clear boundaries for every seat in your workspace.'
                                    : 'Quyền hạn mặc định áp dụng cho từng ghế thành viên.'}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2 text-xs">
                        {TEAM_ROLES.map((role) => (
                            <div
                                key={role.id}
                                className="rounded-xl border border-border/70 bg-background px-3.5 py-2.5"
                            >
                                <div className="font-semibold text-foreground">
                                    {isEn ? role.labelEn : role.label}
                                </div>
                                <p className="label-xs text-muted-foreground mt-0.5">
                                    {isEn ? role.descriptionEn : role.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            {/* Invite Member Dialog */}
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogContent className="sm:max-w-[460px]">
                    <DialogHeader>
                        <DialogTitle>
                            {isEn ? 'Invite Team Member' : 'Mời thành viên & Cấp ghế'}
                        </DialogTitle>
                        <DialogDescription>
                            {isEn
                                ? `Assign 1 of your ${remainingSeats} available seat(s) and generate a join link.`
                                : `Cấp 1 trong ${remainingSeats} ghế trống còn lại và tạo link tham gia workspace.`}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleInviteSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="invite-email" className="label-xs mb-1.5 block">
                                {isEn ? 'Work Email' : 'Email thành viên'} *
                            </Label>
                            <Input
                                id="invite-email"
                                type="email"
                                required
                                placeholder="nhanvien@congty.com"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                            />
                        </div>

                        <div>
                            <Label htmlFor="invite-name" className="label-xs mb-1.5 block">
                                {isEn ? 'Display Name' : 'Tên hiển thị'}
                            </Label>
                            <Input
                                id="invite-name"
                                type="text"
                                placeholder={isEn ? 'e.g. Minh Anh (Content)' : 'Ví dụ: Minh Anh (Content)'}
                                value={inviteName}
                                onChange={(e) => setInviteName(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="invite-role" className="label-xs mb-1.5 block">
                                    {isEn ? 'Role' : 'Vai trò'}
                                </Label>
                                <div className="relative">
                                    <select
                                        id="invite-role"
                                        value={inviteRole}
                                        onChange={(e) => setInviteRole(e.target.value)}
                                        className="h-9 w-full rounded-lg border border-input bg-card pl-3 pr-8 text-xs font-medium text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                                    >
                                        {TEAM_ROLES.map((r) => (
                                            <option key={r.id} value={r.id}>
                                                {isEn ? r.labelEn : r.label}
                                            </option>
                                        ))}
                                    </select>
                                    <CaretDown
                                        size={13}
                                        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="invite-brand" className="label-xs mb-1.5 block">
                                    {isEn ? 'Brand Access' : 'Phạm vi Thương hiệu'}
                                </Label>
                                <div className="relative">
                                    <select
                                        id="invite-brand"
                                        value={inviteBrandScope}
                                        onChange={(e) => setInviteBrandScope(e.target.value)}
                                        className="h-9 w-full rounded-lg border border-input bg-card pl-3 pr-8 text-xs font-medium text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                                    >
                                        <option value="all">{isEn ? 'All brands' : 'Tất cả thương hiệu'}</option>
                                        {brands.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.name}
                                            </option>
                                        ))}
                                    </select>
                                    <CaretDown
                                        size={13}
                                        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                                    />
                                </div>
                            </div>
                        </div>

                        <p className="label-xs text-muted-foreground rounded-lg bg-muted/50 p-2.5">
                            {isEn
                                ? getRoleMeta(inviteRole).descriptionEn
                                : getRoleMeta(inviteRole).description}
                        </p>

                        {inviteError && (
                            <p role="alert" className="text-xs font-medium text-dangerFg">
                                {inviteError}
                            </p>
                        )}

                        <div className="flex flex-wrap justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setInviteOpen(false)}
                            >
                                {isEn ? 'Cancel' : 'Hủy'}
                            </Button>
                            <button type="submit" className="btn-skew">
                                <UserPlus size={16} weight="duotone" />
                                <span>{isEn ? 'Send invite & assign seat' : 'Tạo lời mời & Cấp ghế'}</span>
                            </button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Confirm Remove Seat */}
            <ConfirmDialog
                open={!!removeTarget}
                onOpenChange={(open) => !open && setRemoveTarget(null)}
                title={
                    isEn
                        ? `Release seat for ${removeTarget?.email}?`
                        : `Thu hồi ghế của ${removeTarget?.email}?`
                }
                description={
                    isEn
                        ? 'This member will lose access to this workspace immediately and 1 seat will become available.'
                        : 'Thành viên này sẽ ngừng quyền truy cập workspace ngay lập tức và 1 ghế trống sẽ được hoàn lại.'
                }
                confirmLabel={isEn ? 'Release seat' : 'Thu hồi ghế'}
                destructive
                onConfirm={confirmRemoveMember}
            />
        </div>
    );
}
