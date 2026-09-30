import DashboardLayout from '../components/layouts/DashboardLayout'
import PanelLayout from '../components/layouts/PanelLayout'
import {
    DevServerNotice,
    FailureSummary,
    LogDetail,
    LogFilters,
    LogTable,
    RequestLogHeader,
    RequestTimeline,
    TopBar,
} from '../components/Logs'
import Button from '../design-system/atoms/Button'
import Notice from '../design-system/atoms/Notice'
import Drawer from '../design-system/organisms/Drawer'
import { useDashboard } from '../hooks/dashboard'

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
                <FailureSummary
                    rows={d.rows}
                    selectedHost={d.filters.host}
                    hasFilter={d.hasFilter}
                    onSelectHost={d.selectHost}
                />
            }
            overlay={
                <Drawer
                    isOpen={d.selectedId !== null}
                    label="요청 상세"
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
                        {d.scopeLabel ? (
                            <Notice
                                tone="info"
                                action={
                                    <Button variant="link" size="sm" onClick={d.clearScope}>
                                        해제
                                    </Button>
                                }
                            >
                                {d.scopeLabel}
                            </Notice>
                        ) : null}
                        <RequestTimeline rows={d.rows} selectedId={d.selectedId} onSelect={d.selectRow} />
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
