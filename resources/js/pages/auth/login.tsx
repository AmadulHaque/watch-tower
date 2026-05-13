import { Form, Head } from '@inertiajs/react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import LoginController from '@/actions/App/Http/Controllers/Auth/LoginController';

export default function Login() {
    return (
        <>
            <Head title="Sign in" />
            <div className="flex min-h-screen flex-col bg-muted/40">
                <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
                    <div className="mb-8 flex items-center gap-2">
                        <span className="grid h-8 w-8 place-items-center rounded-md bg-emerald-500 text-sm font-semibold text-white">
                            LW
                        </span>
                        <span className="text-base font-semibold tracking-tight">LaravelWatch</span>
                    </div>

                    <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8 shadow-sm">
                        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Enter your credentials to access the dashboard.
                        </p>

                        <Form {...LoginController.store.form()} className="mt-6 space-y-4">
                            {({ errors, processing }) => (
                                <>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            placeholder="you@example.com"
                                            autoFocus
                                            required
                                        />
                                        {errors.email && (
                                            <p className="text-xs text-rose-600 dark:text-rose-400">{errors.email}</p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="password">Password</Label>
                                        </div>
                                        <Input
                                            id="password"
                                            name="password"
                                            type="password"
                                            autoComplete="current-password"
                                            placeholder="••••••••"
                                            required
                                        />
                                        {errors.password && (
                                            <p className="text-xs text-rose-600 dark:text-rose-400">{errors.password}</p>
                                        )}
                                    </div>

                                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Checkbox name="remember" value="1" />
                                        <span>Remember me</span>
                                    </label>

                                    <Button type="submit" className="w-full" disabled={processing}>
                                        {processing ? 'Signing in…' : 'Sign in'}
                                    </Button>
                                </>
                            )}
                        </Form>
                    </div>

                    <p className="mt-6 text-xs text-muted-foreground">
                        Default seeded credentials: <span className="font-mono">super@laravelwatch.test</span> /{' '}
                        <span className="font-mono">password</span>
                    </p>
                </div>
            </div>
        </>
    );
}
