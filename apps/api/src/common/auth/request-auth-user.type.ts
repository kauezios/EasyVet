import { UserRole } from './user-role.enum';

export type RequestAuthUser = {
  userId: string;
  email: string;
  role: UserRole;
  exp: number;
};

export type RequestWithAuthUser = {
  header: (name: string) => string | undefined;
  authUser?: RequestAuthUser;
};
