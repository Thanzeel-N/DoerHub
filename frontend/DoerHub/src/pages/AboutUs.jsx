import React from "react";

const AboutUs = () => {
  return (
    <div className="min-h-screen bg-black text-yellow-400 py-12 px-6 md:px-20">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-yellow-400 mb-4">
            About Us — DoerHub
          </h1>
          <p className="text-lg text-gray-300">
            Simplifying Services, Empowering Skills
          </p>
          <div className="mt-3 h-1 w-24 bg-yellow-400 mx-auto rounded-full"></div>
        </div>

        {/* Intro */}
        <section className="mb-12 space-y-6 text-gray-200">
          <p className="text-lg leading-relaxed">
            <span className="text-yellow-400 font-semibold">DoerHub</span> is an
            innovative <span className="font-semibold">emergency service and skill-sharing platform</span> that brings
            together essential services and learning opportunities into one seamless ecosystem.
            Whether you need home repairs, beauty treatments, food delivery, or want to learn a
            new skill — DoerHub makes it simple, secure, and accessible in a single platform.
          </p>

          <p className="text-lg leading-relaxed">
            The platform connects two main groups:{" "}
            <span className="text-yellow-400 font-semibold">Users</span>, who request
            services or join skill sessions, and{" "}
            <span className="text-yellow-400 font-semibold">Service Providers</span>, who
            offer professional help and host verified skill-training sessions.
          </p>
        </section>

        {/* Immediate & Scheduled Services */}
        <section className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-yellow-400 mb-4">
            ⚡ Immediate & Scheduled Services
          </h2>
          <p className="text-gray-300 text-lg mb-3">
            DoerHub gives users full flexibility with two ways to access help:
          </p>
          <ul className="list-disc list-inside space-y-3 text-gray-200 text-lg">
            <li>
              <span className="text-yellow-400 font-semibold">Immediate Services</span> — Get
              on-demand assistance for urgent needs like plumbing issues, electrical faults, or
              emergency situations. Verified professionals respond instantly when you need them most.
            </li>
            <li>
              <span className="text-yellow-400 font-semibold">Scheduled Services</span> — Plan ahead by
              booking a service or skill session at your convenience. Perfect for maintenance,
              beauty care, or learning sessions hosted by trusted providers.
            </li>
          </ul>
        </section>

        {/* Vision */}
        <section className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-yellow-400 mb-4">
            🚀 Our Vision
          </h2>
          <p className="text-gray-200 text-lg leading-relaxed">
            To simplify everyday life by merging essential services and skill
            opportunities into one trusted platform that empowers both users and professionals.
          </p>
        </section>

        {/* Mission */}
        <section className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-yellow-400 mb-4">
            💡 Our Mission
          </h2>
          <p className="text-gray-200 text-lg leading-relaxed">
            To create a smart bridge between people who need help and those who
            can provide it — ensuring trust, transparency, and real-time
            efficiency in every interaction.
          </p>
        </section>

        {/* Why Choose */}
        <section className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-yellow-400 mb-4">
            🧰 Why Choose DoerHub?
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-200 text-lg">
            <li>Immediate and scheduled services — your time, your choice</li>
            <li>Verified service providers ensuring safety and reliability</li>
            <li>Skill training sessions hosted by trusted providers</li>
            <li>Real-time tracking and instant communication</li>
            <li>Transparent pricing and secure payments</li>
            <li>Emergency-ready platform with offline support</li>
          </ul>
        </section>

        {/* Promise */}
        <section className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-yellow-400 mb-4">
            🌍 Our Promise
          </h2>
          <p className="text-gray-200 text-lg leading-relaxed">
            At DoerHub, we’re not just building a platform — we’re creating a{" "}
            <span className="text-yellow-400 font-semibold">
              community of trust and empowerment
            </span>
            , where users find reliable help and providers grow their careers by
            sharing both <span className="text-yellow-400">services and skills</span>.
          </p>
        </section>

        {/* Contact */}
        <section className="text-center border-t border-yellow-500 pt-8">
          <h3 className="text-2xl font-bold mb-3 text-yellow-400">📞 Get in Touch</h3>
          <p className="text-lg text-gray-300">
            📧{" "}
            <a
              href="mailto:support@doerhub.com"
              className="text-yellow-400 hover:underline"
            >
              support@doerhub.com
            </a>
          </p>
          <p className="text-lg text-gray-300">
            🌐{" "}
            <a
              href="https://www.doerhub.com"
              className="text-yellow-400 hover:underline"
            >
              www.doerhub.com
            </a>
          </p>
          <p className="text-lg text-gray-300 mt-1">
            📍 Based in India — Serving everywhere
          </p>
        </section>
      </div>
    </div>
  );
};

export default AboutUs;
