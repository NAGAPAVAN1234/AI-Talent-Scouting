import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "ai_talent_scouting")

client = AsyncIOMotorClient(MONGO_URL)

db = client[DB_NAME]

# db = client.talent_scout

candidates_collection = db.get_collection("candidates")
chats_collection = db.get_collection("chats")
jobs_collection = db.get_collection("jobs")
jds_collection = db.get_collection("jds")
