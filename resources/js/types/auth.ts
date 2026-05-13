export type UserRole = 'super_admin' | 'admin';

export type User = {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    avatar_url: string | null;
    is_super_admin: boolean;
    [key: string]: unknown;
};

export type Auth = {
    user: User | null;
};
