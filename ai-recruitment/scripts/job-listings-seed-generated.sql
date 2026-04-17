TRUNCATE TABLE job_listings CASCADE;

INSERT INTO job_listings
  (job_title, company_name, location, job_type, experience_level,
   salary_range, tech_stack, category, is_featured,
   job_description, requirements, responsibilities, nice_to_have)
VALUES
(
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
- Experience with edge computing and CDN architecture'
),
(
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
- Animation expertise (Reanimated, Skia)'
),
(
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
- Experience with PCI-DSS compliance'
),
(
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
- Experience with vector databases'
),
(
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
- Design sensibility and Figma proficiency'
),
(
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
- Open source contributions'
),
(
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
- Rust systems programming'
),
(
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
- Background in bare-metal infrastructure'
),
(
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
- Experience with TPUs'
),
(
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
- Real-time streaming architecture experience'
),
(
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
- Experience with streaming data at scale'
),
(
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
- Research publications in security conferences'
),
(
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
- Apple Watch app development'
),
(
  'AI Engineer (LLM Applications)',
  'Anthropic',
  'San Francisco, CA',
  'Full-time',
  'Senior (4+ years)',
  '$200,000 - $280,000',
  ARRAY['Python','PyTorch','LangChain','FastAPI','PostgreSQL','Redis','Docker','AWS']::text[],
  'ML/AI',
  true,
  'Anthropic is an AI safety company building reliable, interpretable, and steerable AI systems. We are hiring an AI Engineer to join our Claude Applications team, building production AI applications that demonstrate safe and helpful AI behavior to millions of users worldwide.',
  'Requirements:
- 4+ years software engineering with 2+ years AI/ML experience
- Expert Python for production AI systems
- LLM application development (prompt engineering, RAG, agents)
- LangChain, LlamaIndex, or similar AI orchestration frameworks
- FastAPI for high-performance AI inference APIs
- Vector databases (Pinecone, Weaviate, pgvector)
- PostgreSQL for structured data and embeddings
- Redis for caching inference results
- AWS infrastructure for AI workloads
- Strong understanding of LLM capabilities and limitations',
  'Responsibilities:
- Build production-grade AI applications using Claude API
- Design robust prompt engineering and evaluation frameworks
- Implement Retrieval-Augmented Generation (RAG) systems
- Build AI agent orchestration and tool-use systems
- Optimize LLM inference latency and throughput
- Develop comprehensive evaluation suites for AI outputs',
  'Nice to have:
- Published AI safety research
- Experience with fine-tuning LLMs
- RLHF implementation experience'
),
(
  'MLOps Engineer',
  'Hugging Face',
  'Remote (Global)',
  'Full-time',
  'Mid-Senior (3-6 years)',
  '$120,000 - $160,000',
  ARRAY['Python','Docker','Kubernetes','MLflow','Weights & Biases','AWS','GCP','Terraform','Airflow']::text[],
  'ML/AI',
  false,
  'Hugging Face is the AI community building the future of machine learning. We are looking for an MLOps Engineer to join our Infrastructure team, helping thousands of ML researchers and engineers deploy models efficiently on our platform used by millions of AI practitioners globally.',
  'Requirements:
- 3+ years MLOps or ML infrastructure experience
- Python for automation and tooling
- ML experiment tracking (MLflow, Weights & Biases, Neptune)
- Docker for containerizing ML workloads
- Kubernetes for ML pipeline orchestration
- AWS or GCP cloud ML services (SageMaker, Vertex AI)
- Terraform for ML infrastructure as code
- Apache Airflow for ML workflow orchestration
- Model serving (Triton, TorchServe, vLLM)
- CI/CD for ML pipelines (GitHub Actions, GitLab CI)',
  'Responsibilities:
- Build and maintain ML training and inference infrastructure
- Implement automated model evaluation and deployment pipelines
- Design model monitoring and data drift detection systems
- Optimize GPU utilization and training costs
- Build developer tooling for ML teams
- Ensure reproducibility across ML experiments',
  'Nice to have:
- Experience with Hugging Face Transformers
- Custom CUDA kernel development
- Open source contributions to ML projects'
),
(
  'Blockchain Engineer (Solidity)',
  'Coinbase',
  'Remote (US)',
  'Full-time',
  'Senior (4+ years)',
  '$160,000 - $220,000',
  ARRAY['Solidity','Ethereum','JavaScript','TypeScript','Hardhat','ethers.js','React','Go']::text[],
  'Blockchain',
  false,
  'Coinbase is building the cryptoeconomy and onboarding the world to web3. We are looking for a Blockchain Engineer to join our Smart Contracts team, where you will build and audit smart contracts that secure billions of dollars of digital assets for our 100 million+ verified users.',
  'Requirements:
- 4+ years software engineering with 2+ years Solidity
- Deep Ethereum and EVM architecture understanding
- Hardhat or Foundry for smart contract development
- Smart contract security and audit experience
- ethers.js or web3.js for blockchain interaction
- JavaScript/TypeScript proficiency
- Understanding of DeFi protocols (AMMs, lending, bridges)
- Gas optimization techniques
- OpenZeppelin contracts and security standards
- IPFS and decentralized storage concepts',
  'Responsibilities:
- Design and implement secure smart contracts for Coinbase products
- Conduct internal smart contract security audits
- Build developer tooling for the Coinbase smart contract ecosystem
- Optimize gas costs for high-frequency contract interactions
- Collaborate with security team on formal verification
- Stay current with EVM improvements and Layer 2 developments',
  'Nice to have:
- Layer 2 development experience (Optimism, Arbitrum)
- Formal verification tools (Certora, Slither)
- ZK-proof systems knowledge'
),
(
  'Senior QA / SDET Engineer',
  'Microsoft',
  'Redmond, WA (Hybrid)',
  'Full-time',
  'Senior (4+ years)',
  '$130,000 - $170,000',
  ARRAY['Java','Python','Selenium','Playwright','Cypress','JUnit','TestNG','Azure DevOps','Docker']::text[],
  'QA/Testing',
  false,
  'Microsoft is enabling digital transformation for the era of an intelligent cloud and edge. We are hiring a Senior SDET to join our Azure Core team, where you will design and implement test automation frameworks ensuring the quality and reliability of cloud services used by enterprise customers worldwide.',
  'Requirements:
- 4+ years SDET or test automation experience
- Java or Python proficiency for test automation
- Selenium WebDriver and Playwright expertise
- API testing frameworks (RestAssured, Postman, Newman)
- Performance testing tools (JMeter, Gatling, k6)
- Azure DevOps for CI/CD pipeline management
- Docker for test environment containerization
- Test reporting frameworks (Allure, ExtentReports)
- Understanding of cloud testing strategies
- Strong debugging and root cause analysis skills',
  'Responsibilities:
- Design comprehensive test automation frameworks from scratch
- Build end-to-end, integration, and performance test suites
- Integrate automated tests into CI/CD pipelines
- Perform shift-left testing in agile development cycles
- Analyze test results and report quality metrics to leadership
- Mentor junior QA engineers on automation best practices',
  'Nice to have:
- Azure certifications
- Experience with chaos engineering
- Security testing knowledge'
),
(
  'Staff Engineer (Platform)',
  'Figma',
  'San Francisco, CA (Hybrid)',
  'Full-time',
  'Staff (8+ years)',
  '$220,000 - $300,000',
  ARRAY['TypeScript','React','C++','WebAssembly','Node.js','PostgreSQL','AWS','gRPC']::text[],
  'Platform Engineering',
  true,
  'Figma is building tools for the design community and changing the way teams collaborate on product development. We are looking for a Staff Engineer to join our Platform team, where you will set technical direction for infrastructure serving 4 million+ users collaborating in real-time on complex design files.',
  'Requirements:
- 8+ years software engineering experience
- Track record of leading large, cross-functional technical initiatives
- TypeScript and React expertise for web platform development
- Systems programming experience (C++, Rust, or similar)
- WebAssembly (WASM) for performance-critical browser workloads
- Distributed systems design and implementation
- PostgreSQL at scale
- AWS infrastructure and cost optimization
- gRPC and Protocol Buffers for internal APIs
- Strong technical writing and communication skills',
  'Responsibilities:
- Set technical direction for the Figma rendering engine and platform
- Lead architecture decisions affecting the entire engineering organization
- Drive cross-team technical initiatives from design to delivery
- Mentor senior engineers and contribute to engineering culture
- Partner with product leadership on long-term platform strategy
- Represent engineering in cross-functional leadership forums',
  'Nice to have:
- Experience with real-time collaborative editing (CRDTs, OT)
- WebGL or GPU programming
- Open source leadership'
),
(
  'Backend Engineer (Go)',
  'GitHub',
  'Remote (Global)',
  'Full-time',
  'Mid-Senior (3-6 years)',
  '$130,000 - $175,000',
  ARRAY['Go','Ruby','PostgreSQL','Redis','Kafka','Docker','Kubernetes','GitHub Actions','gRPC']::text[],
  'Backend',
  false,
  'GitHub is how the world builds software. We are looking for a Backend Engineer to join our Actions team, where you will build and scale the CI/CD infrastructure that powers millions of automated workflows running across GitHub repositories worldwide every single day.',
  'Requirements:
- 3+ years backend engineering with Go proficiency
- PostgreSQL database design and optimization
- Redis for high-performance caching and queuing
- Kafka for event-driven architecture
- Docker and Kubernetes for container orchestration
- gRPC for internal service communication
- RESTful API design and GraphQL
- GitHub Actions or similar CI/CD experience
- Understanding of developer tooling and workflows
- Strong distributed systems fundamentals',
  'Responsibilities:
- Build and scale GitHub Actions runner infrastructure
- Design event-driven systems for workflow orchestration
- Optimize performance for high-throughput job scheduling
- Build observability tooling for distributed CI/CD systems
- Contribute to open source GitHub Actions ecosystem
- Work closely with the developer community to improve workflows',
  'Nice to have:
- Ruby on Rails experience (existing codebase)
- Experience building developer tools
- Open source project maintainer experience'
),
(
  'Site Reliability Engineer',
  'PagerDuty',
  'Remote (US/CA)',
  'Full-time',
  'Senior (5+ years)',
  '$145,000 - $185,000',
  ARRAY['Go','Python','Kubernetes','Terraform','AWS','Prometheus','Grafana','Jaeger','PostgreSQL']::text[],
  'SRE',
  false,
  'PagerDuty is the leading platform for digital operations management. We are hiring an SRE to join our Reliability Engineering team, ensuring our incident management platform achieves 99.999% availability for enterprise customers who depend on it during their most critical outages.',
  'Requirements:
- 5+ years SRE or platform engineering experience
- Go or Python for reliability tooling development
- Kubernetes cluster management at scale
- Terraform for infrastructure as code
- AWS cloud infrastructure expertise
- Observability stack (Prometheus, Grafana, Jaeger, OpenTelemetry)
- Incident management and on-call best practices
- SLO/SLI/Error budget framework implementation
- Database reliability (PostgreSQL, Redis)
- Strong Linux performance analysis and tuning skills',
  'Responsibilities:
- Define and enforce SLOs for critical PagerDuty services
- Build and maintain observability infrastructure
- Lead major incident response and post-mortem processes
- Implement chaos engineering to proactively find reliability gaps
- Automate toil reduction for operational tasks
- Partner with development teams to improve service reliability',
  'Nice to have:
- Chaos engineering experience (Chaos Monkey, Litmus)
- eBPF performance tooling
- Incident command system (ICS) training'
),
(
  'Developer Advocate / Technical Writer',
  'HashiCorp',
  'Remote (Global)',
  'Full-time',
  'Mid (2-5 years)',
  '$110,000 - $145,000',
  ARRAY['Terraform','Go','Python','REST APIs','Docker','Kubernetes','Technical Writing','Public Speaking']::text[],
  'Developer Relations',
  false,
  'HashiCorp enables organizations to provision, secure, connect, and run any infrastructure for any application. We are looking for a Developer Advocate to join our Terraform team, helping millions of infrastructure engineers learn, adopt, and get the most value from the HashiCorp product suite.',
  'Requirements:
- 2+ years software engineering or DevOps experience
- Terraform proficiency with real-world infrastructure projects
- Strong technical writing and documentation skills
- Public speaking experience (conference talks, webinars)
- Community management and developer relations experience
- Python or Go for technical demo development
- REST API integration and tooling
- Docker and Kubernetes for demo environments
- Git and open source contribution experience
- Strong communication skills across technical audiences',
  'Responsibilities:
- Create technical content (blogs, tutorials, videos, documentation)
- Represent HashiCorp at conferences and community events
- Build sample applications and reference architectures
- Engage with developer community on GitHub, forums, and social
- Gather product feedback and advocate for developer needs internally
- Develop and deliver technical workshops and training',
  'Nice to have:
- Existing developer community following
- HashiCorp certifications
- Experience with Vault, Consul, or Nomad'
),
(
  'Software Engineer II (Java)',
  'Amazon',
  'Austin, TX (Hybrid)',
  'Full-time',
  'Mid (3-5 years)',
  '$140,000 - $175,000',
  ARRAY['Java','Spring Boot','AWS','DynamoDB','Kafka','Docker','Kubernetes','Microservices']::text[],
  'Backend',
  false,
  'Amazon builds technology that helps customers get what they want, when they want it. Join a team shipping high-scale services with strong operational excellence and customer obsession.',
  'Requirements:
- 3+ years Java backend development
- Spring Boot or similar frameworks
- AWS services (EC2, Lambda, S3, DynamoDB)
- Event-driven design with Kafka or Kinesis
- REST API design and distributed systems basics',
  'Responsibilities:
- Design and implement scalable backend services
- Improve reliability, latency, and cost efficiency
- Participate in operational reviews and on-call',
  'Nice to have:
- Experience with high-traffic e-commerce or logistics systems'
),
(
  'Android Engineer (Kotlin)',
  'Uber',
  'Sunnyvale, CA (Hybrid)',
  'Full-time',
  'Mid-Senior (3-6 years)',
  '$145,000 - $185,000',
  ARRAY['Kotlin','Jetpack Compose','Coroutines','Gradle','JUnit','Espresso','REST','Protobuf']::text[],
  'Mobile',
  false,
  'Uber moves people and things. Build the Android experiences millions rely on for mobility and delivery with a focus on performance and reliability.',
  'Requirements:
- 3+ years Android development with Kotlin
- Jetpack Compose or strong Views expertise
- Coroutines and structured concurrency
- Testing with JUnit and Espresso
- REST and gRPC/Protobuf integration experience',
  'Responsibilities:
- Ship features end-to-end on the Android app
- Improve app performance and crash rates
- Collaborate with iOS and backend teams',
  'Nice to have:
- Experience with maps and location-heavy apps'
),
(
  'Product Engineer',
  'Notion',
  'San Francisco, CA (Hybrid)',
  'Full-time',
  'Mid (2-4 years)',
  '$130,000 - $170,000',
  ARRAY['React','TypeScript','Node.js','PostgreSQL','Redis','Electron']::text[],
  'Full Stack',
  false,
  'Notion is the connected workspace for docs, projects, and wikis. Product engineers own features from ideation to launch across web and desktop.',
  'Requirements:
- 2+ years full stack or frontend-heavy experience
- React and TypeScript
- Node.js APIs and relational databases
- Product sense and collaboration with design',
  'Responsibilities:
- Build polished, fast user experiences
- Instrument and iterate based on usage data
- Maintain high code quality through reviews and tests',
  'Nice to have:
- Electron or desktop app experience'
),
(
  'Engineering Manager (Infrastructure)',
  'Atlassian',
  'Remote (US)',
  'Full-time',
  'Senior (6+ years)',
  '$200,000 - $260,000',
  ARRAY['Kubernetes','AWS','Terraform','Go','Java','Observability','People Management']::text[],
  'Platform Engineering',
  false,
  'Atlassian powers teamwork. Lead an infrastructure team building reliable platforms for Jira, Confluence, and more at global scale.',
  'Requirements:
- 6+ years engineering with 2+ years people management
- Strong background in cloud and Kubernetes platforms
- Track record delivering reliability and developer productivity initiatives
- Excellent communication and stakeholder management',
  'Responsibilities:
- Hire, coach, and retain engineers
- Partner with product on roadmap and technical strategy
- Drive SLOs, incident response, and platform investments',
  'Nice to have:
- Experience with multi-tenant SaaS at scale'
);
