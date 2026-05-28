TRUNCATE TABLE job_listings CASCADE;

INSERT INTO job_listings
  (id, job_title, company_name, location, job_type, experience_level,
   salary_range, tech_stack, category, is_featured,
   job_description, requirements, responsibilities, nice_to_have,
   is_active, "createdAt", "updatedAt")
VALUES
(
  gen_random_uuid()::text,
  'Senior Frontend Engineer',
  'Vercel',
  'Remote (Global)',
  'Full-time',
  'Senior (5+ years)',
  '$140,000 - $180,000',
  ARRAY['React','TypeScript','Next.js','Tailwind CSS','GraphQL','Webpack']::text[],
  'Frontend',
  true,
  'Vercel is the platform for frontend developers. We are looking for a Senior Frontend Engineer to join our core product team and help build the future of web development tooling. You will work on performance-critical, developer-facing products used by millions of developers worldwide.',
  'Requirements:
- 5+ years of professional frontend development experience
- Expert-level React and TypeScript proficiency
- Deep understanding of Next.js App Router and Server Components
- Experience with performance optimization (Core Web Vitals, bundle splitting)
- Strong understanding of CSS architecture and design systems
- Experience with testing frameworks (Jest, Playwright, Cypress)
- Proficiency with GraphQL APIs and REST
- Experience with CI/CD pipelines and deployment workflows
- BS/MS in Computer Science or equivalent experience',
  'Responsibilities:
- Architect and implement scalable frontend features for Vercel Dashboard
- Lead performance optimization initiatives across the product
- Collaborate with design team to implement pixel-perfect UI components
- Mentor junior engineers and conduct code reviews
- Drive frontend best practices across the engineering organization
- Participate in on-call rotations for production incidents',
  'Nice to have:
- Experience with Rust or WebAssembly
- Open source contributions
- Experience with edge computing and CDN architecture',
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid()::text,
  'React Native Engineer',
  'Airbnb',
  'San Francisco, CA (Hybrid)',
  'Full-time',
  'Mid-Senior (3-6 years)',
  '$130,000 - $170,000',
  ARRAY['React Native','TypeScript','iOS','Android','Redux','GraphQL','Jest']::text[],
  'Mobile',
  false,
  'Airbnb is building the world''s most loved travel platform. We are hiring a React Native Engineer to help build and scale our mobile applications used by 150 million+ users across iOS and Android platforms globally.',
  'Requirements:
- 3+ years React Native development experience
- Strong TypeScript proficiency
- Experience with iOS and Android native modules
- Deep understanding of mobile performance optimization
- Experience with Redux or Zustand for state management
- Proficiency with GraphQL and REST APIs
- Experience with mobile CI/CD (Fastlane, GitHub Actions)
- Understanding of mobile app release processes (App Store, Play Store)
- Experience with testing (Jest, Detox)',
  'Responsibilities:
- Build and maintain cross-platform mobile features
- Optimize app performance and reduce bundle size
- Collaborate with product and design teams
- Write comprehensive tests for all features
- Debug and resolve production issues
- Mentor junior mobile engineers',
  'Nice to have:
- Native iOS (Swift) or Android (Kotlin) experience
- Experience with Expo
- Animation expertise (Reanimated, Skia)',
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid()::text,
  'Senior Backend Engineer (Node.js)',
  'Stripe',
  'Remote (US)',
  'Full-time',
  'Senior (5+ years)',
  '$160,000 - $210,000',
  ARRAY['Node.js','TypeScript','PostgreSQL','Redis','Kafka','Docker','Kubernetes','AWS']::text[],
  'Backend',
  true,
  'Stripe''s mission is to increase the GDP of the internet. We are looking for a Senior Backend Engineer to join our Payments Infrastructure team, where you will build and maintain systems that process billions of dollars in transactions daily with 99.999% uptime requirements.',
  'Requirements:
- 5+ years backend engineering experience
- Expert Node.js and TypeScript proficiency
- Deep PostgreSQL expertise (query optimization, indexing, transactions)
- Experience with distributed systems and microservices architecture
- Proficiency with message queues (Kafka, RabbitMQ, SQS)
- Experience with Redis for caching and pub/sub
- Strong Docker and Kubernetes knowledge
- AWS or GCP cloud infrastructure experience
- Understanding of financial systems and compliance requirements',
  'Responsibilities:
- Design and implement high-throughput payment processing APIs
- Build fault-tolerant distributed systems with strong consistency guarantees
- Optimize database queries handling millions of transactions per day
- Lead technical design reviews and architecture decisions
- Ensure 99.999% uptime for critical payment infrastructure
- Mentor engineers and drive engineering excellence',
  'Nice to have:
- Experience with Go or Rust
- Financial industry background
- Experience with PCI-DSS compliance',
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid()::text,
  'Python Backend Engineer',
  'OpenAI',
  'San Francisco, CA (On-site)',
  'Full-time',
  'Mid-Senior (3-7 years)',
  '$180,000 - $250,000',
  ARRAY['Python','FastAPI','PostgreSQL','Redis','Celery','Docker','Kubernetes','AWS']::text[],
  'Backend',
  true,
  'OpenAI is on a mission to ensure that artificial general intelligence benefits all of humanity. We are looking for a Python Backend Engineer to join our API Platform team, building the infrastructure that powers ChatGPT and the OpenAI API serving millions of developers globally.',
  'Requirements:
- 3+ years Python backend development experience
- FastAPI or Django/Flask proficiency
- Strong PostgreSQL and database design skills
- Experience with async Python (asyncio, aiohttp)
- Redis for caching, rate limiting, and queuing
- Docker and Kubernetes orchestration
- RESTful API design best practices
- Experience with Celery for distributed task processing
- Understanding of ML infrastructure is a plus',
  'Responsibilities:
- Build and scale APIs serving millions of requests per day
- Design robust rate limiting and quota management systems
- Implement observability and monitoring for AI inference pipelines
- Collaborate with ML researchers to productionize models
- Write comprehensive API documentation and SDKs',
  'Nice to have:
- ML/AI infrastructure experience
- PyTorch or TensorFlow knowledge
- Experience with vector databases',
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid()::text,
  'Full Stack Engineer',
  'Linear',
  'Remote (Global)',
  'Full-time',
  'Mid (2-5 years)',
  '$120,000 - $160,000',
  ARRAY['React','TypeScript','Node.js','PostgreSQL','GraphQL','Prisma','AWS']::text[],
  'Full Stack',
  false,
  'Linear is building the new standard for modern software development. Our project management tool is loved by the world''s best engineering teams. We are a small, high-output team that moves fast and ships products people love.',
  'Requirements:
- 2+ years full stack development experience
- React with TypeScript proficiency
- Node.js backend development experience
- PostgreSQL database design and optimization
- GraphQL API development (schema design, resolvers)
- Prisma or similar ORM experience
- Git and modern development workflows
- Understanding of product design and user experience
- Strong problem-solving and debugging skills',
  'Responsibilities:
- Build end-to-end product features from design to deployment
- Own complete features across frontend and backend
- Collaborate closely with design and product teams
- Write clean, maintainable, well-tested code
- Participate in architecture decisions for new features
- Engage with users and translate feedback into product improvements',
  'Nice to have:
- Experience with Electron or desktop app development
- Real-time collaboration features experience
- Design sensibility and Figma proficiency',
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid()::text,
  'Full Stack Engineer (Next.js + Hono)',
  'Cloudflare',
  'Remote (US/EU)',
  'Full-time',
  'Mid-Senior (3-6 years)',
  '$130,000 - $170,000',
  ARRAY['Next.js','React','TypeScript','Hono','Cloudflare Workers','D1','KV','PostgreSQL']::text[],
  'Full Stack',
  false,
  'Cloudflare is building a better internet. Join our Developer Experience team to build the tools and dashboard that millions of developers use every day to manage their Cloudflare services.',
  'Requirements:
- 3+ years full stack development
- Next.js App Router expertise
- TypeScript proficiency
- Experience building APIs (REST, Hono, Express)
- Cloudflare Workers or edge computing experience preferred
- PostgreSQL or D1 database experience
- Understanding of CDN, DNS, and networking concepts
- Strong CSS skills and responsive design
- Testing with Vitest or Jest',
  'Responsibilities:
- Build and improve the Cloudflare Dashboard used by millions
- Develop edge-native APIs using Cloudflare Workers
- Implement analytics and real-time monitoring features
- Optimize performance for global, low-latency delivery
- Write documentation for developer-facing features',
  'Nice to have:
- Experience with Wrangler CLI
- WebSockets and Durable Objects experience
- Open source contributions',
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid()::text,
  'Senior DevOps Engineer',
  'Datadog',
  'New York, NY (Hybrid)',
  'Full-time',
  'Senior (5+ years)',
  '$150,000 - $200,000',
  ARRAY['Kubernetes','Docker','Terraform','AWS','GCP','Helm','Prometheus','Grafana','Python','Go']::text[],
  'DevOps',
  true,
  'Datadog is the essential monitoring and security platform for cloud applications. We are looking for a Senior DevOps Engineer to join our Platform Engineering team to build, scale, and operate the infrastructure that powers our observability platform processing petabytes of data per day.',
  'Requirements:
- 5+ years DevOps or platform engineering experience
- Expert Kubernetes administration and troubleshooting
- Terraform infrastructure-as-code proficiency
- AWS and/or GCP cloud services expertise
- Docker containerization and image optimization
- Helm chart development and management
- Prometheus, Grafana, and alerting systems
- Python or Go scripting for automation
- Strong Linux systems administration
- Experience with large-scale distributed systems',
  'Responsibilities:
- Design and maintain Kubernetes clusters serving thousands of microservices
- Build self-service infrastructure tooling for engineering teams
- Implement GitOps workflows with ArgoCD or Flux
- Manage observability stack (metrics, logs, traces)
- Lead incident response and post-mortem processes
- Define SLOs and error budgets across platform',
  'Nice to have:
- Service mesh experience (Istio, Linkerd)
- eBPF and kernel-level networking
- Rust systems programming',
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid()::text,
  'Cloud Infrastructure Engineer',
  'AWS',
  'Seattle, WA (Hybrid)',
  'Full-time',
  'Senior (4+ years)',
  '$155,000 - $205,000',
  ARRAY['AWS','EC2','S3','Lambda','VPC','IAM','CloudFormation','Terraform','Python','Go']::text[],
  'Cloud',
  false,
  'Amazon Web Services is the world''s leading cloud platform. We are hiring a Cloud Infrastructure Engineer to join our EC2 Foundations team, where you will help design and build the physical and virtual infrastructure that powers hundreds of AWS services globally.',
  'Requirements:
- 4+ years cloud infrastructure experience
- Deep AWS services expertise (EC2, S3, RDS, Lambda, VPC, IAM)
- CloudFormation and/or Terraform proficiency
- Networking fundamentals (TCP/IP, DNS, load balancing, VPN)
- Security best practices (IAM, encryption, compliance)
- Python automation and scripting
- Linux systems administration
- High availability and disaster recovery design
- Experience with large-scale distributed systems',
  'Responsibilities:
- Design highly available and fault-tolerant cloud architectures
- Implement security hardening across AWS environments
- Automate infrastructure provisioning and management
- Optimize cloud costs through rightsizing and reserved instances
- Build internal tooling for infrastructure management
- Drive cloud adoption best practices across engineering teams',
  'Nice to have:
- AWS certifications (Solutions Architect Professional)
- Experience with networking hardware
- Background in bare-metal infrastructure',
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid()::text,
  'Machine Learning Engineer',
  'Google DeepMind',
  'London, UK / Remote',
  'Full-time',
  'Senior (4+ years)',
  '£130,000 - £180,000',
  ARRAY['Python','PyTorch','TensorFlow','JAX','CUDA','Kubernetes','GCP','MLflow']::text[],
  'ML/AI',
  true,
  'Google DeepMind is at the frontier of AI research. We are looking for a Machine Learning Engineer to join our Gemini team, where you will work alongside world-class researchers to build, train, and deploy large language models that are transforming human-computer interaction.',
  'Requirements:
- 4+ years ML engineering experience
- Python expertise with strong ML fundamentals
- PyTorch or TensorFlow/JAX proficiency for large-scale training
- Understanding of transformer architectures and LLMs
- CUDA and GPU computing knowledge
- ML experiment tracking (MLflow, Weights & Biases)
- Kubernetes for ML workload orchestration
- Strong mathematics (linear algebra, calculus, statistics, probability)
- Experience with distributed training at scale
- Strong software engineering practices',
  'Responsibilities:
- Implement and optimize ML training pipelines for LLMs
- Design evaluation frameworks for model capabilities and safety
- Optimize model inference for production latency requirements
- Build tooling to accelerate ML research workflows
- Collaborate with researchers to translate papers into production systems
- Drive MLOps best practices across the team',
  'Nice to have:
- Research publications in top ML conferences
- RLHF and alignment techniques experience
- Experience with TPUs',
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid()::text,
  'Data Engineer',
  'Databricks',
  'Amsterdam, NL (Hybrid)',
  'Full-time',
  'Mid (2-5 years)',
  '€80,000 - €120,000',
  ARRAY['Python','Apache Spark','Delta Lake','SQL','dbt','Airflow','Kafka','AWS','Scala']::text[],
  'Data',
  false,
  'Databricks is the data and AI company. We are looking for a Data Engineer to join our Data Platform team and build the pipelines, infrastructure, and tooling that powers analytics and ML at scale across our global operations serving thousands of enterprise customers.',
  'Requirements:
- 2+ years data engineering experience
- Python proficiency with PySpark
- Apache Spark and distributed computing expertise
- SQL expertise (query optimization, window functions, CTEs)
- dbt for data transformation workflows
- Apache Airflow or similar orchestration tools
- Kafka or other streaming data processing
- Delta Lake or Iceberg table formats
- AWS/Azure/GCP cloud data services
- Strong understanding of data modeling and warehousing',
  'Responsibilities:
- Build scalable ETL/ELT pipelines processing terabytes of data
- Design and implement data models for analytics and ML
- Ensure data quality through testing and monitoring
- Optimize Spark jobs for performance and cost efficiency
- Collaborate with data scientists and ML engineers
- Maintain data documentation and lineage tracking',
  'Nice to have:
- Scala or Java for Spark development
- Experience with Databricks platform specifically
- Real-time streaming architecture experience',
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid()::text,
  'Data Scientist',
  'Netflix',
  'Los Gatos, CA (Hybrid)',
  'Full-time',
  'Senior (4+ years)',
  '$160,000 - $220,000',
  ARRAY['Python','R','SQL','PyTorch','Spark','Jupyter','scikit-learn','Tableau','A/B Testing']::text[],
  'Data Science',
  false,
  'Netflix is one of the world''s leading entertainment services. We are hiring a Data Scientist for our Personalization Algorithm team, where you will use data to understand 270 million member behavior patterns and develop recommendation algorithms that help members find content they love.',
  'Requirements:
- 4+ years data science experience in industry
- Python and/or R proficiency for statistical analysis
- Expert SQL for large-scale data querying
- Machine learning expertise (classical ML, deep learning)
- Experience with A/B testing and experimental design
- Statistical modeling and causal inference
- Apache Spark for big data processing
- Data visualization (Tableau, matplotlib, plotly)
- Strong communication skills for stakeholder presentations
- PhD or MS in Statistics, Mathematics, or related field preferred',
  'Responsibilities:
- Develop and improve content recommendation algorithms
- Design and analyze large-scale A/B experiments
- Build statistical models to understand member engagement
- Partner with product teams to drive data-informed decisions
- Present insights and recommendations to senior leadership
- Mentor junior data scientists',
  'Nice to have:
- Causal inference and observational study experience
- Reinforcement learning for recommendation systems
- Experience with streaming data at scale',
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid()::text,
  'Security Engineer',
  'Cloudflare',
  'Remote (Global)',
  'Full-time',
  'Mid-Senior (3-6 years)',
  '$130,000 - $170,000',
  ARRAY['Python','Go','Rust','AWS','Kubernetes','Burp Suite','OWASP','CVE Research','Cryptography']::text[],
  'Security',
  false,
  'Cloudflare protects millions of websites from DDoS attacks and security threats. We are looking for a Security Engineer to join our Product Security team, where you will help secure one of the world''s most critical internet infrastructure companies and protect our customers from emerging threats.',
  'Requirements:
- 3+ years security engineering experience
- Strong understanding of web application security (OWASP Top 10)
- Experience with penetration testing and vulnerability research
- Cryptography fundamentals (TLS, PKI, encryption algorithms)
- Python or Go for security tooling development
- Network security (firewalls, IDS/IPS, DDoS mitigation)
- AWS/GCP security services and IAM best practices
- CVE research and responsible disclosure experience
- Understanding of attacker techniques and threat modeling
- Security certifications (CISSP, CEH, OSCP) preferred',
  'Responsibilities:
- Conduct security assessments and penetration testing
- Build automated security scanning pipelines
- Respond to and investigate security incidents
- Design security architectures for new product features
- Perform threat modeling for critical systems
- Collaborate with engineering teams on security-by-design',
  'Nice to have:
- Bug bounty experience
- Rust systems programming
- Research publications in security conferences',
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid()::text,
  'iOS Engineer (Swift)',
  'Spotify',
  'Stockholm, Sweden (Hybrid)',
  'Full-time',
  'Mid-Senior (3-5 years)',
  'SEK 650,000 - SEK 900,000',
  ARRAY['Swift','SwiftUI','UIKit','Combine','XCTest','Fastlane','GraphQL','Instruments']::text[],
  'Mobile',
  false,
  'Spotify is the world''s most popular music streaming service with 600 million+ users. We are looking for an iOS Engineer to join our Player Experience team, where you will build and optimize the core music playback experience on iOS, ensuring millions of users enjoy seamless audio streaming.',
  'Requirements:
- 3+ years iOS development with Swift
- SwiftUI and UIKit proficiency
- Combine or RxSwift for reactive programming
- Core Audio framework knowledge for audio applications
- XCTest and UI testing expertise
- Instruments for performance profiling
- REST and GraphQL API integration
- Fastlane and iOS CI/CD workflows
- App Store submission and review process experience
- Strong understanding of iOS memory management and concurrency',
  'Responsibilities:
- Build and optimize core music playback features
- Improve audio streaming performance and offline capabilities
- Implement sophisticated UI animations and transitions
- Write comprehensive unit and integration tests
- Profile and fix performance bottlenecks
- Collaborate with backend teams on API design',
  'Nice to have:
- Audio processing and DSP knowledge
- CarPlay development experience
- Apple Watch app development',
  true,
  NOW(),
  NOW()
);
