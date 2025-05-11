# LangChain + OpenAI 기반 GPT 세무비서 구조화 자료 검색 응답 흐름 예시

from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import FAISS
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chat_models import ChatOpenAI
from langchain.chains import RetrievalQA
from langchain.schema import Document
import json

# 1. 문서 불러오기 (jsonl → LangChain 문서 객체로 변환)
def load_jsonl(file_path):
    docs = []
    with open(file_path, encoding="utf-8") as f:
        for line in f:
            item = json.loads(line)
            docs.append(Document(page_content=item["content"], metadata={"source": item["title"]}))
    return docs

# 2. 파일 불러오기 (법령/통달/판례/서식)
law_docs = load_jsonl("법령_LangChain_docs.jsonl")
tongdal_docs = load_jsonl("통달_LangChain_docs.jsonl")
case_docs = load_jsonl("판례_LangChain_docs.jsonl")
form_docs = load_jsonl("서식_LangChain_docs.jsonl")

# 3. 전체 문서 통합 후 벡터화
all_docs = law_docs + tongdal_docs + case_docs + form_docs

text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
doc_chunks = text_splitter.split_documents(all_docs)

embedding = OpenAIEmbeddings()
vectorstore = FAISS.from_documents(doc_chunks, embedding)

# 4. GPT 모델 설정 + 검색 QA 체인 구성
llm = ChatOpenAI(model_name="gpt-3.5-turbo", temperature=0)
qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    retriever=vectorstore.as_retriever(),
    return_source_documents=True
)

# 5. 질문 예시
query = "給与明細書に記載する控除項目はどの通達に基づきますか？"
result = qa_chain.run(query)

print("\n[🔍 질문 결과]")
print(result)
