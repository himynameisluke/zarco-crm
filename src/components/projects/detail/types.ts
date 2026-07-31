import type { ProjectDetail } from "@/lib/projects/queries";
import type { HealthAdvisory, ProjectHealthValue } from "@/lib/projects/health";

export type MemberOption = { id: string; name: string };

export type ProjectDetailData = ProjectDetail;

export type ProjectAdvisories = {
  advisories: HealthAdvisory[];
  suggestedHealth: ProjectHealthValue;
};

export type ProjectTaskRow = ProjectDetail["tasks"][number];
export type ProjectMilestoneRow = ProjectDetail["milestones"][number];
export type ProjectRiskRow = ProjectDetail["risks"][number];
export type ProjectLinkRow = ProjectDetail["links"][number];
export type ProjectPhaseRow = ProjectDetail["phases"][number];
export type ProjectActivityRow = ProjectDetail["recentActivities"][number];
