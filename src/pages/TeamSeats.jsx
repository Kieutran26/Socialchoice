import { useState, useEffect } from 'react';
import {
    UsersThree,
    CheckCircle,
    Clock,
    ShieldCheck,
} from '@phosphor-icons/react';
import { useTranslation } from '@/lib/i18n';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import TeamSeatsPanel from '@/components/team/TeamSeatsPanel';
import {
    getActiveSubscription,
    getTeamMembers,
    getTeamSettings,
} from '@/lib/team-seats';

export default function TeamSeats() {
    const { language } = useTranslation();
    const isEn = language === 'en';

    const [subscription, setSubscription] = useState(getActiveSubscription);
    const [members, setMembers] = useState(getTeamMembers);
    const [teamSettings, setTeamSettings] = useState(getTeamSettings);

    useEffect(() => {
        const sync = () => {
            setSubscription(getActiveSubscription());
            setMembers(getTeamMembers());
            setTeamSettings(getTeamSettings());
        };
        window.addEventListener('storage', sync);
        window.addEventListener('socialchoice:subscription', sync);
        window.addEventListener('socialchoice:team', sync);
        return () => {
            window.removeEventListener('storage', sync);
            window.removeEventListener('socialchoice:subscription', sync);
            window.removeEventListener('socialchoice:team', sync);
        };
    }, []);

    const maxSeats = Math.max(1, Number(subscription?.quotas?.seats || 1));
    const usedSeats = 1 + members.length;
    const activeMembersCount = 1 + members.filter((m) => m.status === 'active').length;
    const pendingCount = members.filter((m) => m.status !== 'active').length;

    return (
        <div className="space-y-6">
            <PageHeader
                title={isEn ? 'Team & Seats' : 'Thành viên & Ghế (Teams Seats)'}
                description={
                    isEn
                        ? 'Assign workspace seats, control brand permissions, and configure post approval rules.'
                        : 'Quản lý ghế thành viên theo gói, phân quyền 4 vai trò và bật/tắt quy trình duyệt bài nhóm.'
                }
            />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <StatCard
                    label={isEn ? 'Seats Used' : 'Ghế đang dùng'}
                    value={`${usedSeats} / ${maxSeats}`}
                    hint={subscription.planName}
                    icon={UsersThree}
                    iconBg="bg-muted/60 border-border/60"
                    iconColor="text-foreground"
                />
                <StatCard
                    label={isEn ? 'Active Members' : 'Đang hoạt động'}
                    value={activeMembersCount}
                    hint={isEn ? 'Owner + accepted seats' : 'Bao gồm Chủ sở hữu'}
                    icon={CheckCircle}
                    iconBg="bg-muted/60 border-border/60"
                    iconColor="text-foreground"
                />
                <StatCard
                    label={isEn ? 'Pending Invites' : 'Lời mời chờ nhận'}
                    value={pendingCount}
                    hint={isEn ? 'Reserved seats' : 'Đang giữ ghế'}
                    icon={Clock}
                    iconBg="bg-muted/60 border-border/60"
                    iconColor="text-foreground"
                />
                <StatCard
                    label={isEn ? 'Approval Gate' : 'Chế độ duyệt bài'}
                    value={
                        teamSettings.requireApprovalForEditors
                            ? isEn
                                ? 'Required'
                                : 'Bắt buộc'
                            : isEn
                                ? 'Optional'
                                : 'Tự do'
                    }
                    hint={isEn ? 'For Editor drafts' : 'Áp dụng cho Editor'}
                    icon={ShieldCheck}
                    iconBg="bg-muted/60 border-border/60"
                    iconColor="text-foreground"
                />
            </div>

            <TeamSeatsPanel />
        </div>
    );
}
