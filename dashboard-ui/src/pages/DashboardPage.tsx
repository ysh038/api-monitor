import DashboardLayout from '../components/layouts/DashboardLayout'
import PanelLayout from '../components/layouts/PanelLayout'
import {
    DevServerNotice,
    FailureSummary,
    LogDetail,
    LogFilters,
    LogTable,
    ProblemSummary,
    RequestLogHeader,
    TopBar,
} from '../components/Logs'
import Drawer from '../design-system/organisms/Drawer'
import { useDashboard } from '../hooks/dashboard'

/** 상세 패널 폭 조절 — 기본 560px, 최소 400px, 이 브라우저에 기억 (docs/specs/dashboard-detail-resize.md) */
const DETAIL_RESIZE = { defaultWidth: 560, minWidth: 400, storageKey: 'api-monitor.detail-width' }

/** 대시보드 화면 — 훅을 부르고 조립만 한다 */
function DashboardPage() {
    const d = useDashboard()

    return (
        <DashboardLayout
            topbar={
                <TopBar
                    isDev={d.isDev}
                    isAutoRefresh={d.isAutoRefresh}
                    lastUpdatedAt={d.lastUpdatedAt}
                    devMessage={d.devMessage}
                    isMockPending={d.isMockPending}
                    themePreference={d.themePreference}
                    onToggleAutoRefresh={d.setAutoRefresh}
                    onChangeTheme={d.setThemePreference}
                    onInsertMock={d.insertMock}
                    onDeleteMock={d.deleteMock}
                />
            }
            notice={d.devServerNotice ? <DevServerNotice notice={d.devServerNotice} /> : undefined}
            summary={
                <FailureSummary />
            }
            overlay={
                <Drawer
                    isOpen={d.selectedId !== null}
                    label="요청 상세"
                    resize={DETAIL_RESIZE}
                    contentKey={d.selectedId ?? undefined}
                    onClose={d.closeDetail}
                >
                    <LogDetail detail={d.detail} isLoading={d.isDetailLoading} onNavigate={d.selectRow} />
                </Drawer>
            }
        >
            <PanelLayout
                label="요청 기록"
                top={
                    <>
                        <RequestLogHeader
                            visibleCount={d.rows.length}
                            totalCount={d.totalCount}
                            isGroupingSuccess={d.isGroupingSuccess}
                            onGroupingChange={d.setGroupingSuccess}
                        />
                        <LogFilters
                            filters={d.filters}
                            searchText={d.searchText}
                            onKindChange={d.changeKind}
                            onToggleStatus={d.toggleStatus}
                            onSearchTextChange={d.setSearchText}
                        />
                        <ProblemSummary rows={d.rows} onSelect={d.selectRow} />
                    </>
                }
                body={
                    <LogTable
                        rows={d.rows}
                        isGroupingSuccess={d.isGroupingSuccess}
                        selectedId={d.selectedId}
                        newIds={d.newIds}
                        hasFilter={d.hasFilter}
                        hasMore={d.hasMore}
                        isLoading={d.isLoading}
                        isLoadingMore={d.isLoadingMore}
                        isUpdating={d.isUpdating}
                        onSelect={d.selectRow}
                        onLoadMore={d.loadMore}
                    />
                }
            />
        </DashboardLayout>
    )
}

export default DashboardPage
