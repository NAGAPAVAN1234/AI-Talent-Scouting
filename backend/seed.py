import asyncio
from database import candidates_collection

sample_candidates = [
    {
        "name": "Alice Johnson",
        "skills": ["python", "react", "mongodb", "fastapi", "docker", "rest apis"],
        "experience_years": 4.5,
        "location": "New York, NY",
        "expected_salary": "$120k",
        "notice_period": "30 days",
        "email": "alice.johnson@email.com",
        "current_role": "Senior Backend Developer at TechCorp",
        "education": "B.S. Computer Science, NYU",
        "bio": "Passionate full-stack engineer with a focus on scalable microservices and modern React UIs.",
        "portfolio_url": "https://alicejohnson.dev"
    },
    {
        "name": "Bob Smith",
        "skills": ["java", "spring boot", "sql", "microservices", "kafka"],
        "experience_years": 2.0,
        "location": "San Francisco, CA",
        "expected_salary": "$100k",
        "notice_period": "60 days",
        "email": "bob.smith@email.com",
        "current_role": "Junior Software Engineer at StartupHub",
        "education": "B.E. Software Engineering, SFSU",
        "bio": "Backend developer specializing in Java ecosystems and event-driven architectures.",
        "portfolio_url": ""
    },
    {
        "name": "Charlie Davis",
        "skills": ["react", "node.js", "express", "typescript", "graphql", "aws"],
        "experience_years": 5.0,
        "location": "Remote",
        "expected_salary": "$140k",
        "notice_period": "Immediate",
        "email": "charlie.davis@email.com",
        "current_role": "Lead Frontend Engineer at WebAgency",
        "education": "M.S. Computer Science, Stanford",
        "bio": "Full-stack TypeScript wizard. Loves GraphQL and clean component architectures.",
        "portfolio_url": "https://charliedavis.io"
    },
    {
        "name": "Diana Prince",
        "skills": ["python", "machine learning", "pytorch", "fastapi", "pandas", "nlp"],
        "experience_years": 3.0,
        "location": "Austin, TX",
        "expected_salary": "$130k",
        "notice_period": "15 days",
        "email": "diana.prince@email.com",
        "current_role": "ML Engineer at AIStartup",
        "education": "M.S. AI & Machine Learning, UT Austin",
        "bio": "ML engineer with expertise in NLP, fine-tuning LLMs, and productionizing AI pipelines.",
        "portfolio_url": "https://dianaprince.ai"
    },
    {
        "name": "Evan Wright",
        "skills": ["html", "css", "javascript", "vue.js", "figma", "scss"],
        "experience_years": 1.5,
        "location": "Chicago, IL",
        "expected_salary": "$80k",
        "notice_period": "30 days",
        "email": "evan.wright@email.com",
        "current_role": "Frontend Developer at DesignStudio",
        "education": "B.F.A. Interactive Design, DePaul University",
        "bio": "UI-focused developer bridging design and code. Proficient in Vue and advanced CSS animations.",
        "portfolio_url": "https://evanwright.design"
    },
    {
        "name": "Priya Sharma",
        "skills": ["python", "django", "react", "postgresql", "redis", "celery", "docker"],
        "experience_years": 6.0,
        "location": "Remote",
        "expected_salary": "$150k",
        "notice_period": "30 days",
        "email": "priya.sharma@email.com",
        "current_role": "Senior Software Engineer at FinTech Inc",
        "education": "B.Tech Computer Science, IIT Bombay",
        "bio": "Full-stack engineer with 6 years building high-throughput FinTech platforms using Python and React.",
        "portfolio_url": "https://priyasharma.dev"
    },
    {
        "name": "Marcus Lee",
        "skills": ["go", "kubernetes", "terraform", "aws", "gcp", "ci/cd", "linux"],
        "experience_years": 7.0,
        "location": "Seattle, WA",
        "expected_salary": "$160k",
        "notice_period": "45 days",
        "email": "marcus.lee@email.com",
        "current_role": "Staff DevOps Engineer at CloudCorp",
        "education": "B.S. Computer Engineering, UW",
        "bio": "Infrastructure specialist with deep expertise in cloud-native systems, Kubernetes orchestration, and IaC.",
        "portfolio_url": ""
    },
    {
        "name": "Sophia Chen",
        "skills": ["data science", "python", "r", "tableau", "sql", "spark", "machine learning"],
        "experience_years": 4.0,
        "location": "Boston, MA",
        "expected_salary": "$125k",
        "notice_period": "30 days",
        "email": "sophia.chen@email.com",
        "current_role": "Data Scientist at AnalyticsCo",
        "education": "M.S. Data Science, MIT",
        "bio": "Data scientist turning raw data into business insights. Expert in predictive modeling and Spark pipelines.",
        "portfolio_url": "https://sophiachen.ai"
    }
]


async def seed():
    count = await candidates_collection.count_documents({})
    if count == 0:
        await candidates_collection.insert_many(sample_candidates)
        print(f"[seed] Seeded {len(sample_candidates)} candidates.")
    else:
        print(f"[seed] Already has {count} candidates. Skipping.")


async def force_reseed():
    await candidates_collection.delete_many({})
    await candidates_collection.insert_many(sample_candidates)
    print(f"[seed] Force-reseeded {len(sample_candidates)} candidates.")


if __name__ == "__main__":
    import sys
    if "--force" in sys.argv:
        asyncio.run(force_reseed())
    else:
        asyncio.run(seed())