const Section = ({ title, children }) => (
    <section className="object-transform">
        <div className="text-left p-0.5 text-black font-medium text-xs">{title}</div>
        <div className="flex h-fit w-fit gap-3 text-black text-sm font-mono">{children}</div>
    </section>
);

export default Section