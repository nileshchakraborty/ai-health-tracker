export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8">
            {/* Hero Section */}
            <div className="text-center max-w-4xl mx-auto">
                {/* Logo/Icon */}
                <div className="mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 shadow-lg shadow-primary-500/30">
                        <svg
                            className="w-10 h-10 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                            />
                        </svg>
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary-300 via-primary-400 to-primary-500 bg-clip-text text-transparent">
                    AIDOC
                </h1>

                {/* Subtitle */}
                <p className="text-xl md:text-2xl text-gray-300 mb-8 leading-relaxed">
                    Your personal AI-powered health assistant.
                    <br />
                    <span className="text-primary-400">Privacy-first. Offline-first. Always with you.</span>
                </p>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <FeatureCard
                        icon="🏃"
                        title="Health Tracking"
                        description="Oura Ring, Apple Watch, Apple Health"
                    />
                    <FeatureCard
                        icon="🤖"
                        title="Local AI"
                        description="Powered by Ollama - no cloud needed"
                    />
                    <FeatureCard
                        icon="🔒"
                        title="Privacy First"
                        description="Your data stays on your device"
                    />
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a
                        href="/dashboard"
                        className="px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl font-semibold text-lg hover:from-primary-400 hover:to-primary-500 transition-all duration-200 shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40"
                    >
                        Get Started
                    </a>
                    <a
                        href="https://github.com/your-username/ai-health-tracker"
                        className="px-8 py-4 bg-white/10 backdrop-blur-sm rounded-xl font-semibold text-lg hover:bg-white/20 transition-all duration-200 border border-white/20"
                    >
                        View on GitHub
                    </a>
                </div>
            </div>

            {/* Status Indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></span>
                    <span>System Ready</span>
                </div>
            </div>
        </main>
    );
}

function FeatureCard({
    icon,
    title,
    description,
}: {
    icon: string;
    title: string;
    description: string;
}) {
    return (
        <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-primary-500/50 transition-all duration-200">
            <div className="text-4xl mb-4">{icon}</div>
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-gray-400 text-sm">{description}</p>
        </div>
    );
}
