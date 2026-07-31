"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectHeader } from "./project-header";
import { OverviewPanel } from "./overview-panel";
import { TasksPanel } from "./tasks-panel";
import { MilestonesPanel } from "./milestones-panel";
import { RisksPanel } from "./risks-panel";
import { ActivityPanel } from "./activity-panel";
import { NotesPanel } from "./notes-panel";
import { LinksPanel } from "./links-panel";
import type { MemberOption, ProjectAdvisories, ProjectDetailData } from "./types";

export function ProjectWorkspace({
  detail,
  members,
  progress,
  advisories,
  activitiesTotal,
}: {
  detail: ProjectDetailData;
  members: MemberOption[];
  progress: number | null;
  advisories: ProjectAdvisories;
  activitiesTotal: number;
}) {
  const openTaskCount = detail.tasks.filter(
    (t) => t.status !== "done" && t.status !== "cancelled",
  ).length;
  const openRiskCount = detail.risks.filter((r) => r.status !== "resolved").length;

  return (
    <div className="space-y-6">
      <ProjectHeader
        project={detail.project}
        organization={detail.organization}
        phases={detail.phases}
        members={members}
        progress={progress}
        advisories={advisories}
      />

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">
            Tasks{openTaskCount > 0 ? ` (${openTaskCount})` : ""}
          </TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="risks">
            Risks &amp; blockers{openRiskCount > 0 ? ` (${openRiskCount})` : ""}
          </TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="links">Links</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-4">
          <OverviewPanel detail={detail} />
        </TabsContent>
        <TabsContent value="tasks" className="pt-4">
          <TasksPanel
            projectId={detail.project.id}
            tasks={detail.tasks}
            members={members}
            phases={detail.phases}
            milestones={detail.milestones}
          />
        </TabsContent>
        <TabsContent value="milestones" className="pt-4">
          <MilestonesPanel
            projectId={detail.project.id}
            milestones={detail.milestones}
            members={members}
            phases={detail.phases}
          />
        </TabsContent>
        <TabsContent value="risks" className="pt-4">
          <RisksPanel projectId={detail.project.id} risks={detail.risks} members={members} />
        </TabsContent>
        <TabsContent value="activity" className="pt-4">
          <ActivityPanel
            projectId={detail.project.id}
            initialActivities={detail.recentActivities}
            initialTotal={activitiesTotal}
          />
        </TabsContent>
        <TabsContent value="notes" className="pt-4">
          <NotesPanel projectId={detail.project.id} recentActivities={detail.recentActivities} />
        </TabsContent>
        <TabsContent value="links" className="pt-4">
          <LinksPanel projectId={detail.project.id} links={detail.links} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
