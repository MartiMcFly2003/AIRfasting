"use client";

export function DialogShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/80 px-6 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-ivory/10 bg-obsidian p-6 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        {children}
      </div>
    </div>
  );
}

export function DialogTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-heading text-2xl tracking-wide text-ivory">{children}</h2>;
}

export function DialogBody({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 font-body text-sm leading-relaxed text-silver">{children}</p>;
}

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="w-full rounded-full bg-coral px-4 py-2.5 font-accent text-sm font-medium text-obsidian transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
    />
  );
}

export function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="w-full rounded-full border border-ivory/20 px-4 py-2.5 font-accent text-sm text-ivory transition-colors hover:bg-ivory/10"
    />
  );
}

export function CancelLink(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="mt-4 w-full text-center font-accent text-xs text-silver hover:text-ivory hover:underline"
    />
  );
}
