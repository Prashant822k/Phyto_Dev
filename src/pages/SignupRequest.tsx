import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const SignupRequest: React.FC = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [golfCourse, setGolfCourse] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  return (
    <main className="min-h-screen w-full" style={{ backgroundImage: "linear-gradient(135deg, #009688, #00bfa5)" }}>
      <section className="min-h-screen flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[640px] bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-shadow duration-200">
          {/* Header */}
          <div className="px-8 pt-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-white shadow flex items-center justify-center overflow-hidden">
              <img 
                src="/logo-phytomaps.jpg" 
                alt="PhytoMaps" 
                className="w-10 h-10 object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg' }}
              />
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-gray-900">Request Access</h1>
            <p className="mt-1 text-sm text-gray-500">Create an account to access your golf course data</p>
          </div>

          {/* Form */}
          <form
            className="px-8 pb-8 pt-6 space-y-4"
            aria-label="Request access form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!email || !password || !firstName) {
                toast({ title: "Missing details", description: "Please fill First Name, Email and Password." });
                return;
              }
              try {
                setLoading(true);
                const { error } = await supabase.auth.signUp({
                  email,
                  password,
                  options: {
                    data: {
                      first_name: firstName,
                      last_name: lastName,
                      golf_course: golfCourse,
                      source: "self_signup",
                    },
                  },
                });
                if (error) throw error;
                toast({ title: "Check your email", description: "We sent a verification link to complete signup." });
                navigate("/login-client");
              } catch (err) {
                toast({
                  title: "Signup failed",
                  description: err instanceof Error ? err.message : "Please try again later",
                  variant: "destructive",
                });
              } finally {
                setLoading(false);
              }
            }}
          >
            {/* Name row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="firstName" className="text-sm font-medium text-gray-700">First Name</label>
                <input id="firstName" placeholder="Enter first name" value={firstName} onChange={(e)=>setFirstName(e.target.value)} className="w-full h-11 rounded-full border border-gray-300 px-4 focus:outline-none focus:ring-2 focus:ring-[#1ba29a]/30 focus:border-[#1ba29a] transition" />
              </div>
              <div className="space-y-2">
                <label htmlFor="lastName" className="text-sm font-medium text-gray-700">Last Name</label>
                <input id="lastName" placeholder="Enter last name" value={lastName} onChange={(e)=>setLastName(e.target.value)} className="w-full h-11 rounded-full border border-gray-300 px-4 focus:outline-none focus:ring-2 focus:ring-[#1ba29a]/30 focus:border-[#1ba29a] transition" />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address</label>
              <input id="email" type="email" placeholder="Enter your email" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full h-11 rounded-full border border-gray-300 px-4 focus:outline-none focus:ring-2 focus:ring-[#1ba29a]/30 focus:border-[#1ba29a] transition" />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
              <input id="password" type="password" placeholder="Enter password" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full h-11 rounded-full border border-gray-300 px-4 focus:outline-none focus:ring-2 focus:ring-[#1ba29a]/30 focus:border-[#1ba29a] transition" />
            </div>

            <div className="space-y-2">
              <label htmlFor="golfCourse" className="text-sm font-medium text-gray-700">Golf Course Name</label>
              <input id="golfCourse" placeholder="Enter your golf course name" value={golfCourse} onChange={(e)=>setGolfCourse(e.target.value)} className="w-full h-11 rounded-full border border-gray-300 px-4 focus:outline-none focus:ring-2 focus:ring-[#1ba29a]/30 focus:border-[#1ba29a] transition" />
            </div>

            <button type="submit" disabled={loading} className="w-full h-11 rounded-full bg-[#1ba29a] text-white font-medium hover:bg-[#17948c] transition-colors disabled:opacity-60">
              {loading ? "Submitting..." : "Request Access"}
            </button>

            <div className="mt-2 text-center">
              <Link to="/login-client" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 hover:underline transition-colors">
                <span>◀</span>
                <span>Back to Login</span>
              </Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
};

export default SignupRequest;
