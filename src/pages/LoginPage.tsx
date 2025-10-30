import React, { useState } from "react";

const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="min-h-screen w-full">
      <section className="min-h-screen grid md:grid-cols-[60%_40%]">
        {/* Left 60%: Brand Panel */}
        <div
          className="relative flex items-center justify-center px-8 py-10"
          style={{ background: "#1ba29a" }}
        >
          {/* Admin link bottom-left */}
          <div className="absolute left-4 bottom-4 text-white/80 text-sm hover:underline cursor-pointer">
            Admin
          </div>

          <div className="w-full max-w-2xl flex flex-col items-center text-center md:items-start md:text-left">
            {/* White circular logo area */}
            <div className="w-64 h-64 rounded-full bg-white shadow-2xl flex items-center justify-center overflow-hidden">
              <img src="/logo-phytomaps.jpg" alt="PhytoMaps logo" className="w-56 h-56 object-contain" />
            </div>

            {/* Brand name below logo */}
            <div className="mt-3 text-3xl font-semibold text-white drop-shadow-sm">PhytoMaps</div>

            {/* Subtitle */}
            <p className="mt-6 text-white text-lg font-medium">
              Golf Course Mapping & Analysis Portal
            </p>
          </div>
        </div>

        {/* Right 40%: Login Card Section */}
        <div className="bg-white flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-[420px]">
            {/* Card */}
            <div className="rounded-2xl border border-gray-100 shadow-xl hover:shadow-2xl transition-shadow duration-200">
              {/* Header */}
              <div className="px-8 pt-8 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-teal-100 text-[#1ba29a] flex items-center justify-center text-xl">
                  {/* user icon */}
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M12 12c2.8 0 5-2.2 5-5s-2.2-5-5-5-5 2.2-5 5 2.2 5 5 5Zm0 2c-3.3 0-10 1.7-10 5v1h20v-1c0-3.3-6.7-5-10-5Z" />
                  </svg>
                </div>
                <h1 className="mt-3 text-xl font-semibold text-gray-900">Client Access</h1>
                <p className="mt-1 text-sm text-gray-500">Sign in to view your course data</p>
              </div>

              {/* Form */}
              <form className="px-8 pb-8 pt-6 space-y-4" aria-label="Client sign in form">
                {/* Email */}
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    className="w-full h-11 rounded-full border border-gray-300 px-4 focus:outline-none focus:ring-2 focus:ring-[#1ba29a]/30 focus:border-[#1ba29a] transition"
                  />
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="w-full h-11 rounded-full border border-gray-300 px-4 pr-10 focus:outline-none focus:ring-2 focus:ring-[#1ba29a]/30 focus:border-[#1ba29a] transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" />
                          <path
                            d="M10.58 10.58A3 3 0 0012 15a3 3 0 003-3c0-.39-.08-.76-.22-1.1M9.88 4.49A9.76 9.76 0 0112 4c6 0 10 6 10 6s-.76 1.31-2.14 2.79M6.3 6.3C4.1 7.66 2 10 2 10s4 6 10 6c1.43 0 2.77-.33 3.96-.88"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Sign In */}
                <button
                  type="submit"
                  className="w-full h-11 rounded-full bg-[#1ba29a] text-white font-medium hover:bg-[#17948c] transition-colors"
                >
                  Sign In
                </button>

                {/* Links */}
                <div className="flex items-center justify-between text-sm">
                  <button type="button" className="text-teal-700 hover:underline transition-colors">
                    Forgot Password?
                  </button>
                  <a href="#request-access" className="text-teal-700 hover:underline transition-colors">
                    Request Access
                  </a>
                </div>

                <p className="text-center text-sm text-gray-600">
                  Don’t have an account?{" "}
                  <a href="#request-access" className="text-teal-700 hover:underline transition-colors">
                    Request Access
                  </a>
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Font family fallback if Tailwind base not overriding */}
      <style>{`
        :root { --app-font: Inter, Poppins, ui-sans-serif, system-ui, -apple-system; }
        body, input, button { font-family: var(--app-font); }
      `}</style>
    </main>
  );
};

export default LoginPage;
