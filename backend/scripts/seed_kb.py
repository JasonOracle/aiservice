"""
向 RAG 知识库注入种子文档
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from rag import RAGEngine

DOCS = [
    ("产品手册.txt", """AI 商城产品手册
机械键盘 K8 Pro：Gasket 结构，热插拔轴，支持 51 键无冲突，兼容 RGB 背光。
降噪耳机 ANC-X：主动降噪，40 小时续航，蓝牙 5.3，支持 LDAC 编码。
蛋白粉：乳清蛋白，每 100g 含蛋白质 80g，低糖配方，适合增肌期。
冲锋衣 GORE-TEX：防水指数 20000mm，透气指数 20000mm，适合户外露营。
手办 限量款：PVC 材质，1/8 比例，附底座。
岩茶 大红袍：武夷山正岩，2024 秋香，焙火工艺，回甘持久。
"""),
    ("售后政策.txt", """售后政策说明
7 天无理由退货：商品签收后 7 天内可无理由退货。
质量问题：30 天内质量问题免费换新。
定制商品：不支持无理由退货。
运费：质量问题换货运费由商家承担。
"""),
    ("FAQ.txt", """常见问题
问：AI 客服支持哪些问题？
答：商品咨询、售后政策、物流查询。
问：如何转人工客服？
答：在聊天框输入"转人工"或点击"转人工"按钮。
问：会员有什么特权？
答：免费运费、优先发货、专属折扣。
"""),
]

if __name__ == "__main__":
    print("向 RAG 注入种子文档...")
    for filename, content in DOCS:
        doc_id = RAGEngine.add_document(filename, content)
        print(f"  [新增] {filename} -> id={doc_id}")
    print(f"\n完成！当前共 {len(RAGEngine.list_documents())} 个文档。")
