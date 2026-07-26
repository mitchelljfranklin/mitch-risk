export type ControlSeed = {
  domain: string;
  code: string;
  title: string;
  guidance: string;
  isSharedResponsibility?: boolean;
};

export type FrameworkSeed = {
  name: string;
  version: string;
  description: string;
  controls: ControlSeed[];
};
