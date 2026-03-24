<!DOCTYPE html>

<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Add Candidate | RecruitOps</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=Manrope:wght@500;600;700;800&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
    tailwind.config = {
      darkMode: "class",
      theme: {
        extend: {
          colors: {
            "on-tertiary-container": "#d0d8f2",
            "primary-fixed-dim": "#b2c5ff",
            "on-surface-variant": "#424654",
            "inverse-primary": "#b2c5ff",
            "tertiary": "#3f465c",
            "secondary-fixed": "#d5e3fc",
            "on-primary-fixed": "#001847",
            "on-error-container": "#93000a",
            "surface": "#f7f9fb",
            "surface-container": "#eceef0",
            "secondary": "#515f74",
            "primary": "#0040a1",
            "surface-container-high": "#e6e8ea",
            "on-secondary-container": "#57657a",
            "surface-variant": "#e0e3e5",
            "on-secondary-fixed": "#0d1c2e",
            "on-secondary": "#ffffff",
            "tertiary-fixed-dim": "#bec6e0",
            "tertiary-container": "#565e74",
            "surface-container-low": "#f2f4f6",
            "on-tertiary-fixed": "#131b2e",
            "on-background": "#191c1e",
            "error": "#ba1a1a",
            "primary-container": "#0056d2",
            "surface-dim": "#d8dadc",
            "on-primary-fixed-variant": "#0040a1",
            "on-primary": "#ffffff",
            "surface-tint": "#0056d2",
            "inverse-surface": "#2d3133",
            "surface-container-highest": "#e0e3e5",
            "outline": "#737785",
            "on-secondary-fixed-variant": "#3a485b",
            "tertiary-fixed": "#dae2fd",
            "surface-container-lowest": "#ffffff",
            "surface-bright": "#f7f9fb",
            "on-surface": "#191c1e",
            "on-tertiary": "#ffffff",
            "secondary-fixed-dim": "#b9c7df",
            "background": "#f7f9fb",
            "error-container": "#ffdad6",
            "secondary-container": "#d5e3fc",
            "primary-fixed": "#dae2ff",
            "on-error": "#ffffff",
            "on-tertiary-fixed-variant": "#3f465c",
            "on-primary-container": "#ccd8ff",
            "outline-variant": "#c3c6d6",
            "inverse-on-surface": "#eff1f3"
          },
          fontFamily: {
            "headline": ["Manrope"],
            "body": ["Inter"],
            "label": ["Inter"]
          },
          borderRadius: {"DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px"},
        },
      },
    }
  </script>
<style>
    .material-symbols-outlined {
      font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    }
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .glass-header {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(12px);
    }
  </style>
</head>
<body class="bg-surface font-body text-on-surface antialiased flex">
<!-- SideNavBar -->
<aside class="fixed left-0 top-0 h-screen w-64 z-50 bg-slate-50 dark:bg-slate-950 flex flex-col h-full p-4 space-y-2">
<div class="flex items-center gap-3 px-2 mb-8">
<div class="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white">
<span class="material-symbols-outlined text-sm" data-icon="corporate_fare">corporate_fare</span>
</div>
<div>
<h2 class="font-manrope font-bold text-slate-900 dark:text-slate-100 text-base leading-none">Global Talent</h2>
<p class="text-[0.6875rem] text-slate-500 font-medium">Lead Recruiter</p>
</div>
</div>
<nav class="flex-1 space-y-1">
<a class="flex items-center gap-3 px-3 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 transition-all duration-200 ease-in-out font-inter text-[0.875rem]" href="#">
<span class="material-symbols-outlined" data-icon="dashboard">dashboard</span>
        Dashboard
      </a>
<a class="flex items-center gap-3 px-3 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 transition-all duration-200 ease-in-out font-inter text-[0.875rem]" href="#">
<span class="material-symbols-outlined" data-icon="work">work</span>
        Jobs
      </a>
<!-- Active State Logic: Candidates is the target context -->
<a class="flex items-center gap-3 px-3 py-2 text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-900 rounded-md font-semibold font-inter text-[0.875rem] transition-all duration-200 ease-in-out" href="#">
<span class="material-symbols-outlined" data-icon="group" style="font-variation-settings: 'FILL' 1;">group</span>
        Candidates
      </a>
<a class="flex items-center gap-3 px-3 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 transition-all duration-200 ease-in-out font-inter text-[0.875rem]" href="#">
<span class="material-symbols-outlined" data-icon="calendar_today">calendar_today</span>
        Interviews
      </a>
<a class="flex items-center gap-3 px-3 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 transition-all duration-200 ease-in-out font-inter text-[0.875rem]" href="#">
<span class="material-symbols-outlined" data-icon="insights">insights</span>
        Analytics
      </a>
</nav>
<div class="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-1">
<a class="flex items-center gap-3 px-3 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 transition-all duration-200 ease-in-out font-inter text-[0.875rem]" href="#">
<span class="material-symbols-outlined" data-icon="help_outline">help_outline</span>
        Support
      </a>
<a class="flex items-center gap-3 px-3 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 transition-all duration-200 ease-in-out font-inter text-[0.875rem]" href="#">
<span class="material-symbols-outlined" data-icon="settings">settings</span>
        Settings
      </a>
</div>
</aside>
<!-- Main Content Area -->
<main class="ml-64 flex-1 min-h-screen relative bg-surface">
<!-- TopNavBar -->
<header class="fixed top-0 right-0 left-64 h-14 z-40 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md flex items-center justify-between px-6 shadow-none">
<div class="flex items-center gap-4">
<h1 class="text-lg font-extrabold font-manrope text-slate-900 dark:text-slate-50">Add Candidate</h1>
</div>
<div class="flex items-center gap-4">
<div class="relative group">
<span class="material-symbols-outlined text-slate-500 cursor-pointer" data-icon="notifications">notifications</span>
<div class="absolute -top-1 -right-1 w-2 h-2 bg-error rounded-full"></div>
</div>
<span class="material-symbols-outlined text-slate-500 cursor-pointer" data-icon="question_mark">question_mark</span>
<div class="w-8 h-8 rounded-full bg-slate-200 overflow-hidden ring-2 ring-white/10">
<img class="w-full h-full object-cover" data-alt="Professional headshot of a recruiter in a business casual environment" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDcPlaH25BbJtVjkVN3EhCJtQHwzR6YuY2ACF0NpB1Zuos9SHR8h3b1pkS8oN5ciuXvz4eYdTPVTS4BGOr4yhbPPVhyC8p_bKvYwG2tpWBOAURqfbqqxkrkj4Ktr4QDryVOUp5sX6CISy5kfsu5CVn-3IcaBV0C4wk8uJdNEblrmxlzSXnRYv90hS4_ZDLmQELvrdRERYv13fuWcUw710AmCcCo5k6tRBS38TmOMaLEE0TLrBBzF1EF0rb3pVjGcFoZEDOGd5_TCVwC"/>
</div>
</div>
</header>
<div class="pt-20 px-8 pb-12 max-w-6xl mx-auto">
<!-- Asymmetric Bento-Style Grid Layout -->
<div class="grid grid-cols-12 gap-6">
<!-- Left Column: Resume Upload & Parsing State -->
<div class="col-span-12 lg:col-span-5 space-y-6">
<!-- Drag & Drop Zone -->
<div class="bg-surface-container-lowest rounded-xl p-8 flex flex-col items-center justify-center text-center border-2 border-dashed border-outline-variant/30 group hover:border-primary/50 transition-colors h-[320px]">
<div class="w-16 h-16 rounded-full bg-primary-container/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
<span class="material-symbols-outlined text-primary text-3xl" data-icon="upload_file">upload_file</span>
</div>
<h3 class="font-headline font-bold text-on-surface text-lg mb-1">Upload Resume</h3>
<p class="text-outline text-sm mb-6 max-w-[240px]">Drop your PDF or DOCX file here to auto-fill the profile fields.</p>
<button class="px-6 h-9 bg-primary text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity flex items-center gap-2">
<span class="material-symbols-outlined text-lg" data-icon="add">add</span>
              Select File
            </button>
<p class="mt-4 text-[0.6875rem] text-outline uppercase tracking-wider font-semibold">Max file size: 10MB</p>
</div>
<!-- Parsing Status Card (Active State Simulation) -->
<div class="bg-surface-container-low rounded-xl p-5 border border-outline-variant/15">
<div class="flex items-center justify-between mb-4">
<h4 class="font-headline font-bold text-sm text-on-surface">AI Parser Status</h4>
<span class="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[0.625rem] font-bold tracking-wider uppercase">Active</span>
</div>
<div class="space-y-4">
<div class="flex items-center gap-3">
<div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
<p class="text-xs text-on-surface-variant font-medium">Extracting contact details...</p>
</div>
<!-- Progress Bar -->
<div class="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
<div class="h-full bg-primary rounded-full" style="width: 65%;"></div>
</div>
<!-- Extraction Snippets -->
<div class="grid grid-cols-2 gap-2 mt-4">
<div class="p-2 bg-surface-container-lowest rounded border border-outline-variant/10">
<p class="text-[0.625rem] text-outline font-bold uppercase mb-1">Detected Name</p>
<p class="text-[0.8125rem] font-semibold text-on-surface">Alex Rivera</p>
</div>
<div class="p-2 bg-surface-container-lowest rounded border border-outline-variant/10">
<p class="text-[0.625rem] text-outline font-bold uppercase mb-1">Role Match</p>
<p class="text-[0.8125rem] font-semibold text-on-surface">Product Designer</p>
</div>
</div>
</div>
</div>
<!-- Duplicate Check (Error State Simulation) -->
<div class="bg-error-container/30 rounded-xl p-4 border border-error/10 flex items-start gap-3">
<span class="material-symbols-outlined text-error" data-icon="warning">warning</span>
<div>
<p class="text-[0.8125rem] font-bold text-on-error-container">Potential Duplicate Found</p>
<p class="text-[0.75rem] text-on-error-container/80 mt-0.5">A profile with alex.rivera@design.com already exists in the 'Talent Pool' stage.</p>
<button class="mt-2 text-[0.75rem] font-bold text-error underline decoration-2 underline-offset-2">View Existing Profile</button>
</div>
</div>
</div>
<!-- Right Column: Candidate Form -->
<div class="col-span-12 lg:col-span-7 bg-surface-container-lowest rounded-xl p-8 shadow-sm">
<form class="space-y-8">
<!-- Section: Personal Information -->
<section>
<div class="flex items-center gap-2 mb-6">
<span class="material-symbols-outlined text-primary text-xl" data-icon="person">person</span>
<h3 class="font-headline font-bold text-on-surface">Personal Information</h3>
</div>
<div class="grid grid-cols-2 gap-6">
<div class="space-y-1.5">
<label class="text-[0.6875rem] font-bold text-outline uppercase tracking-wider px-1">Full Name</label>
<input class="w-full h-10 px-4 bg-surface-container-low border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 placeholder:text-outline/50 transition-shadow" type="text" value="Alex Rivera"/>
</div>
<div class="space-y-1.5">
<label class="text-[0.6875rem] font-bold text-outline uppercase tracking-wider px-1">Email Address</label>
<input class="w-full h-10 px-4 bg-surface-container-low border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20" type="email" value="alex.rivera@design.com"/>
</div>
<div class="space-y-1.5">
<label class="text-[0.6875rem] font-bold text-outline uppercase tracking-wider px-1">Phone Number</label>
<input class="w-full h-10 px-4 bg-surface-container-low border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20" placeholder="+1 (555) 000-0000" type="tel"/>
</div>
<div class="space-y-1.5">
<label class="text-[0.6875rem] font-bold text-outline uppercase tracking-wider px-1">Location</label>
<input class="w-full h-10 px-4 bg-surface-container-low border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20" placeholder="e.g. San Francisco, CA" type="text"/>
</div>
</div>
</section>
<!-- Section: Professional Details -->
<section>
<div class="flex items-center gap-2 mb-6 pt-4 border-t border-outline-variant/10">
<span class="material-symbols-outlined text-primary text-xl" data-icon="business_center">business_center</span>
<h3 class="font-headline font-bold text-on-surface">Professional Details</h3>
</div>
<div class="grid grid-cols-2 gap-6">
<div class="col-span-2 space-y-1.5">
<label class="text-[0.6875rem] font-bold text-outline uppercase tracking-wider px-1">Current Role</label>
<input class="w-full h-10 px-4 bg-surface-container-low border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20" placeholder="e.g. Senior Product Designer" type="text"/>
</div>
<div class="space-y-1.5">
<label class="text-[0.6875rem] font-bold text-outline uppercase tracking-wider px-1">Expected CTC (Annual)</label>
<div class="relative">
<span class="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-medium text-sm">$</span>
<input class="w-full h-10 pl-8 pr-4 bg-surface-container-low border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20" placeholder="140,000" type="number"/>
</div>
</div>
<div class="space-y-1.5">
<label class="text-[0.6875rem] font-bold text-outline uppercase tracking-wider px-1">Notice Period</label>
<select class="w-full h-10 px-4 bg-surface-container-low border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20">
<option>Immediate</option>
<option>15 Days</option>
<option>30 Days</option>
<option>60 Days</option>
<option>90 Days</option>
</select>
</div>
<div class="col-span-2 space-y-3">
<label class="text-[0.6875rem] font-bold text-outline uppercase tracking-wider px-1">Key Skills</label>
<div class="flex flex-wrap gap-2">
<span class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-low rounded-full text-[0.8125rem] font-semibold text-on-surface group cursor-pointer hover:bg-surface-container-high transition-colors">
                      Figma <span class="material-symbols-outlined text-xs text-outline" data-icon="close">close</span>
</span>
<span class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-low rounded-full text-[0.8125rem] font-semibold text-on-surface group cursor-pointer hover:bg-surface-container-high transition-colors">
                      UX Research <span class="material-symbols-outlined text-xs text-outline" data-icon="close">close</span>
</span>
<span class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-low rounded-full text-[0.8125rem] font-semibold text-on-surface group cursor-pointer hover:bg-surface-container-high transition-colors">
                      Prototyping <span class="material-symbols-outlined text-xs text-outline" data-icon="close">close</span>
</span>
<button class="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-container/10 border border-primary/20 border-dashed rounded-full text-[0.8125rem] font-bold text-primary hover:bg-primary-container/20 transition-colors">
<span class="material-symbols-outlined text-sm" data-icon="add">add</span>
                      Add Skill
                    </button>
</div>
</div>
</div>
</section>
<!-- Success State Action Area -->
<div class="flex items-center justify-between pt-8 border-t border-outline-variant/10">
<button class="text-sm font-bold text-outline hover:text-on-surface transition-colors" type="button">Discard Draft</button>
<div class="flex gap-3">
<button class="h-9 px-6 bg-secondary-container text-on-secondary-container rounded-lg font-bold text-sm hover:opacity-90 transition-opacity" type="submit">Save &amp; Add Another</button>
<button class="h-9 px-8 bg-gradient-to-br from-primary to-primary-container text-white rounded-lg font-bold text-sm shadow-sm hover:opacity-95 transition-opacity" type="submit">Create Profile</button>
</div>
</div>
</form>
</div>
</div>
</div>
<!-- Success Feedback Overlay (Hidden by default, shown for UX demonstration) -->
<div class="hidden fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
<div class="bg-surface-container-lowest rounded-2xl p-10 max-w-md w-full shadow-2xl text-center">
<div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
<span class="material-symbols-outlined text-green-600 text-4xl" data-icon="check_circle" style="font-variation-settings: 'FILL' 1;">check_circle</span>
</div>
<h2 class="font-headline font-bold text-2xl text-on-surface mb-2">Profile Created!</h2>
<p class="text-on-surface-variant mb-8">Alex Rivera has been successfully added to the RecruitOps database.</p>
<div class="flex flex-col gap-3">
<button class="w-full h-11 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition-opacity">Go to Candidate Profile</button>
<button class="w-full h-11 bg-surface-container-low text-on-surface rounded-xl font-bold hover:bg-surface-container-high transition-colors">Add Another Candidate</button>
</div>
</div>
</div>
<!-- Floating Toast Notification -->
<div class="fixed bottom-6 right-6 z-50 flex items-center gap-4 bg-inverse-surface text-inverse-on-surface px-6 py-4 rounded-xl shadow-xl max-w-sm">
<span class="material-symbols-outlined text-green-400" data-icon="info">info</span>
<p class="text-[0.875rem] font-medium flex-1">Resume parsed successfully. 8 fields auto-filled.</p>
<button class="text-[0.75rem] font-bold text-primary-fixed uppercase tracking-wider">Undo</button>
</div>
</main>
</body></html>