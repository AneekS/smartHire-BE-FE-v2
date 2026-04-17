INSERT INTO job_listings
  (job_title, company_name, location, job_type, experience_level,
   salary_range, tech_stack, category, is_featured,
   job_description, requirements, responsibilities, nice_to_have)
VALUES
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
