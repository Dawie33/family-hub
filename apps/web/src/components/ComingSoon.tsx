'use client';

interface ComingSoonProps {
  icon: string;
  title: string;
  description?: string;
}

export default function ComingSoon({ icon, title, description }: ComingSoonProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#11253E', fontFamily: 'Nunito, sans-serif' }}>
          {title}
        </h1>
      </div>
      <div
        className="rounded-2xl p-16 text-center border border-dashed"
        style={{ borderColor: '#DDE3EE', backgroundColor: '#FAFBFD' }}
      >
        <p className="text-6xl mb-4">{icon}</p>
        <p className="font-bold text-base mb-2" style={{ color: '#32325D' }}>Bientôt disponible</p>
        <p className="text-sm" style={{ color: '#999' }}>
          {description ?? `La section "${title}" est en cours de développement.`}
        </p>
      </div>
    </div>
  );
}
