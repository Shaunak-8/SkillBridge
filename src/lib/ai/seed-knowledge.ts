import { KnowledgeChunk } from "@/types/ai";

export const SEED_KNOWLEDGE_CHUNKS: (KnowledgeChunk & { keywords: string[] })[] = [
  {
    id: "kc-web-01",
    sourceId: "tpl-cafe-ordering",
    sourceType: "approved_template",
    language: "en",
    category: "Web development",
    content:
      "Template: Mobile-first Order Management Portal for Cafes and Bakeries. Key Deliverables: Customer order selection interface, kitchen order display queue, order status toggles (New, Preparing, Ready), SMS/WhatsApp status notification trigger. Essential Skills: React, Tailwind CSS, State Management. Typical Milestones: Phase 1 Workflow Discovery (Week 1), Phase 2 Interactive Prototype (Week 2-3), Phase 3 Handover and Staff Training (Week 4).",
    keywords: ["cafe", "bakery", "order", "ordering", "ticket", "kitchen", "menu", "restaurant", "food", "ऑर्डर", "बेकरी"],
  },
  {
    id: "kc-web-02",
    sourceId: "tpl-retail-inventory",
    sourceType: "approved_template",
    language: "en",
    category: "Web development",
    content:
      "Template: Small Business Inventory Tracker. Key Deliverables: Stock item dashboard, low-stock threshold alerts, CSV export/import, barcode scanner integration. Essential Skills: React, Data Analytics, Spreadsheet parsing. Milestones: Phase 1 Data Model Setup, Phase 2 Dashboard UI, Phase 3 Inventory Audit & Testing.",
    keywords: ["inventory", "stock", "spreadsheet", "tracker", "retail", "store", "warehouse", "items", "goods", "स्टॉक", "सामान"],
  },
  {
    id: "kc-mkt-01",
    sourceId: "tpl-social-festive",
    sourceType: "approved_template",
    language: "en",
    category: "Marketing",
    content:
      "Template: Festive Campaign & Social Media Launch. Key Deliverables: 2-week social content calendar, short promo videos/reels, promotional poster templates, engagement metrics tracking. Essential Skills: Social media marketing, Copywriting, Graphic design. Milestones: Week 1 Content Strategy & Copywriting, Week 2 Visual Asset Creation, Week 3 Campaign Launch & Review.",
    keywords: ["social", "marketing", "festive", "campaign", "instagram", "facebook", "reels", "poster", "brand", "मार्केटिंग", "प्रचार"],
  },
  {
    id: "kc-mkt-02",
    sourceId: "tpl-brand-story",
    sourceType: "approved_template",
    language: "en",
    category: "Marketing",
    content:
      "Template: Brand Identity & Storytelling Refresh. Key Deliverables: Refreshed brand narrative, tagline options, customer persona guides, website homepage copy. Essential Skills: Copywriting, Brand Strategy, Community Engagement.",
    keywords: ["story", "brand", "narrative", "tagline", "copywriting", "content", "website copy", "about us"],
  },
  {
    id: "kc-photo-01",
    sourceId: "tpl-product-photography",
    sourceType: "approved_template",
    language: "en",
    category: "Photography",
    content:
      "Template: E-Commerce Product Photography & Styling. Key Deliverables: 20 high-res product hero shots, styled lifestyle scene photos, color-corrected edit exports for web/catalog. Essential Skills: Product photography, Lighting setup, Photo editing (Lightroom/Photoshop).",
    keywords: ["photo", "photography", "product", "styling", "catalog", "pictures", "images", "clothing", "pottery", "फोटो", "तस्वीर"],
  },
  {
    id: "kc-culinary-01",
    sourceId: "tpl-menu-development",
    sourceType: "approved_template",
    language: "en",
    category: "Culinary",
    content:
      "Template: Seasonal Regional Menu Development. Key Deliverables: 5-6 new seasonal recipe standardized spec sheets, ingredient costing matrix, food presentation styling guide. Essential Skills: Recipe testing, Menu planning, Ingredient sourcing.",
    keywords: ["menu", "recipe", "culinary", "baking", "dishes", "food", "ingredients", "tasting", "kitchen", "व्यंजन", "खाना"],
  },
  {
    id: "kc-data-01",
    sourceId: "tpl-sales-analytics",
    sourceType: "approved_template",
    language: "en",
    category: "Data & analytics",
    content:
      "Template: Small Business Sales & Revenue Analytics Dashboard. Key Deliverables: Automated sales performance summary, top-selling product ranking, customer repeat purchase analysis. Essential Skills: Data analytics, Data visualization, Python/SQL or Excel dashboards.",
    keywords: ["data", "analytics", "dashboard", "sales", "revenue", "metrics", "excel", "charts", "रिपोर्ट", "आंकड़े"],
  },
  {
    id: "kc-events-01",
    sourceId: "tpl-community-meetup",
    sourceType: "approved_template",
    language: "en",
    category: "Events",
    content:
      "Template: Local Maker Community Gathering. Key Deliverables: Event logistics plan, venue layout design, attendee registration workflow, promotional flyer. Essential Skills: Event planning, Vendor coordination, Community outreach.",
    keywords: ["event", "meetup", "gathering", "community", "workshop", "launch", "venue", "आयोजन"],
  },
  {
    id: "kc-guide-01",
    sourceId: "guidance-milestones",
    sourceType: "project_guidance",
    language: "en",
    category: "General",
    content:
      "Guidance: Structuring Student Projects. Projects should be divided into 2 to 3 clear phases: Phase 1 Discovery (requirements alignment & wireframes), Phase 2 Build/Draft (core deliverables creation), and Phase 3 Delivery & Walkthrough. Keep scope focused to 2-4 weeks.",
    keywords: ["guidance", "phase", "timeline", "scope", "milestones", "weeks", "deliverables"],
  },
  {
    id: "kc-guide-02",
    sourceId: "guidance-skills",
    sourceType: "project_guidance",
    language: "en",
    category: "General",
    content:
      "Guidance: Identifying Student Skill Requirements. Distinguish essential core technical/creative skills (e.g. React, Photography) from supporting business skills (e.g. Copywriting, Communication). Assign skill levels as beginner, intermediate, or advanced.",
    keywords: ["skills", "essential", "technical", "creative", "business", "level"],
  },
];
