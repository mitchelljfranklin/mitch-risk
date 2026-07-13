import { defineConfig } from "vitepress";

const sidebar = [
  {
    text: "Welcome",
    collapsed: true,
    items: [
      { text: "Introduction", link: "/welcome/introduction" },
      { text: "Screenshots", link: "/welcome/screenshots" },
      { text: "Quick Start", link: "/quick-start" },
    ],
  },
  {
    text: "User Guides",
    collapsed: true,
    items: [
      { text: "Dashboard", link: "/user-guides/dashboard" },
      { text: "Templates", link: "/user-guides/templates" },
      { text: "Assessments", link: "/user-guides/assessments" },
      { text: "Review & Findings", link: "/user-guides/review" },
      { text: "Scoring Methodology", link: "/user-guides/scoring" },
      { text: "Self-Assessment", link: "/user-guides/self-assessment" },
      { text: "Vendors", link: "/user-guides/vendors" },
      { text: "RBAC & Roles", link: "/user-guides/rbac" },
    ],
  },
  {
    text: "Configuration",
    collapsed: true,
    items: [
      { text: "Overview", link: "/configuration/overview" },
      { text: "Appearance", link: "/configuration/appearance" },
      { text: "SSO", link: "/configuration/sso" },
      { text: "Email", link: "/configuration/email" },
      { text: "Scoring", link: "/configuration/scoring" },
      { text: "Webhooks", link: "/configuration/webhooks" },
    ],
  },
  {
    text: "API Reference",
    collapsed: true,
    items: [
      { text: "Overview", link: "/api-reference/overview" },
      { text: "Vendors", link: "/api-reference/vendors" },
      { text: "Assessments", link: "/api-reference/assessments" },
      { text: "Findings", link: "/api-reference/findings" },
      { text: "Frameworks", link: "/api-reference/frameworks" },
      { text: "Dashboard", link: "/api-reference/dashboard" },
      { text: "Audit", link: "/api-reference/audit" },
      { text: "OpenAPI / Swagger", link: "/api-reference/openapi" },
    ],
  },
  {
    text: "Deployment",
    collapsed: true,
    items: [
      { text: "Docker", link: "/deployment/docker" },
      { text: "Azure Container Apps", link: "/deployment/azure-container-apps" },
      { text: "Reverse Proxy", link: "/deployment/reverse-proxy" },
      { text: "Cloud Storage", link: "/deployment/cloud-storage" },
    ],
  },
  {
    text: "Advanced",
    collapsed: true,
    items: [
      { text: "Cron & Automation", link: "/advanced/cron" },
      { text: "Security", link: "/advanced/security" },
      { text: "Threat Model", link: "/advanced/threat-model" },
      { text: "Compliance Coverage", link: "/advanced/compliance-coverage" },
      { text: "Integration Examples", link: "/advanced/integration-examples" },
    ],
  },
  {
    text: "FAQ",
    link: "/faq",
  },
];

export default defineConfig({
  title: "Mitch‑Risk",
  description:
    "Lightweight third party vendor risk management — build questionnaires, assess vendors, track compliance",
  lang: "en-US",
  srcDir: ".",
  cleanUrls: true,
  lastUpdated: true,

  head: [
    [
      "link",
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/favicon.svg",
      },
    ],
    ["meta", { name: "theme-color", content: "#2563eb" }],
  ],

  themeConfig: {
    logo: "/favicon.svg",
    search: {
      provider: "local",
    },

    nav: [
      { text: "Home", link: "/" },
      {
        text: "GitHub",
        link: "https://github.com/mitchelljfranklin/mitch-risk",
      },
    ],

    sidebar,

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/mitchelljfranklin/mitch-risk",
      },
    ],

    editLink: {
      pattern:
        "https://github.com/mitchelljfranklin/mitch-risk/edit/master/docs/:path",
      text: "Edit this page on GitHub",
    },

    outline: [2, 3],

    footer: {
      message:
        "Open-source, self-hosted third party vendor risk management.",
    },
  },

  vite: {
    server: {
      fs: {
        allow: [".."],
      },
    },
  },
});
