export type DashboardCard = {
  label: string;
  value: string;
  note: string;
  icon: string;
};

export type DashboardAction = {
  label: string;
  description: string;
  path: string;
  icon: string;
};

export type DashboardProgress = {
  label: string;
  value: number;
};

export type DashboardFlowStep = {
  order: string;
  label: string;
  description: string;
};

export type DashboardOverview = {
  role: string;
  title: string;
  subtitle: string;
  cards: DashboardCard[];
  actions: DashboardAction[];
  progress: DashboardProgress[];
  flow: DashboardFlowStep[];
};