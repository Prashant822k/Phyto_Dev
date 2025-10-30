import React from 'react'

const LoadingSplash = () => {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center p-6">
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        <div className="text-center md:text-left">
          <div className="mx-auto md:mx-0 w-48 h-48 rounded-full bg-white shadow-lg flex items-center justify-center overflow-hidden">
            <img 
              src="/logo-phytomaps.jpg" 
              alt="PhytoMaps logo" 
              className="w-40 h-40 object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg' }}
            />
          </div>
          <p className="mt-6 text-white/90 text-lg">Golf Course Mapping & Analysis Portal</p>
        </div>
        <div className="mx-auto w-full max-w-md">
          <div className="bg-white rounded-xl shadow-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl">👤</div>
              <div>
                <h2 className="text-xl font-semibold">Client Access</h2>
                <p className="text-sm text-muted-foreground">Sign in to view your course data</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email Address</label>
                <input disabled placeholder="Enter your email" className="w-full border rounded-md px-3 py-2 bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input disabled placeholder="Enter your password" className="w-full border rounded-md px-3 py-2 bg-gray-50" />
              </div>
              <button disabled className="w-full h-10 rounded-md bg-emerald-600 text-white opacity-80">Sign In</button>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Forgot Password?</span>
                <span>Request Access</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoadingSplash
