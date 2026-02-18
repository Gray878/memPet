#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Chat 接口测试脚本

测试 /chat 和 /chat/stream 接口的功能
"""

import asyncio
import json
import httpx
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000"


async def test_basic_chat():
    """测试基础对话"""
    print("\n" + "=" * 60)
    print("测试 1: 基础对话")
    print("=" * 60)
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{BASE_URL}/chat",
            json={
                "message": "你好，我是你的主人",
                "personality": "friendly"
            }
        )
        
        print(f"状态码: {response.status_code}")
        result = response.json()
        print(f"响应: {result.get('response', '')}")
        print(f"使用记忆数: {result.get('memories_used', 0)}")
        
        if response.status_code == 200:
            print("✓ 基础对话测试通过")
        else:
            print(f"✗ 基础对话测试失败: {result}")


async def test_chat_with_history():
    """测试带历史记录的对话"""
    print("\n" + "=" * 60)
    print("测试 2: 带历史记录的对话")
    print("=" * 60)
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{BASE_URL}/chat",
            json={
                "message": "我今天工作了多久？",
                "history": [
                    {
                        "role": "user",
                        "content": "我今天工作了 8 小时"
                    },
                    {
                        "role": "assistant",
                        "content": "辛苦了！工作 8 小时确实挺累的，记得休息哦~"
                    }
                ],
                "personality": "friendly"
            }
        )
        
        print(f"状态码: {response.status_code}")
        result = response.json()
        print(f"响应: {result.get('response', '')}")
        
        if response.status_code == 200:
            print("✓ 历史记录对话测试通过")
        else:
            print(f"✗ 历史记录对话测试失败: {result}")


async def test_different_personalities():
    """测试不同性格"""
    print("\n" + "=" * 60)
    print("测试 3: 不同性格")
    print("=" * 60)
    
    personalities = ["friendly", "energetic", "professional", "tsundere"]
    message = "我有点累了"
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        for personality in personalities:
            print(f"\n性格: {personality}")
            response = await client.post(
                f"{BASE_URL}/chat",
                json={
                    "message": message,
                    "personality": personality
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"响应: {result.get('response', '')}")
            else:
                print(f"✗ 失败: {response.text}")
    
    print("\n✓ 不同性格测试完成")


async def test_stream_chat():
    """测试流式对话"""
    print("\n" + "=" * 60)
    print("测试 4: 流式对话")
    print("=" * 60)
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream(
            "POST",
            f"{BASE_URL}/chat/stream",
            json={
                "message": "用一句话介绍你自己",
                "personality": "friendly"
            }
        ) as response:
            print(f"状态码: {response.status_code}")
            print("流式响应:")
            
            full_response = ""
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = json.loads(line[6:])
                    if "chunk" in data:
                        chunk = data["chunk"]
                        print(chunk, end="", flush=True)
                        full_response += chunk
                    elif data.get("done"):
                        print("\n")
                        break
            
            if response.status_code == 200:
                print("✓ 流式对话测试通过")
            else:
                print(f"✗ 流式对话测试失败")


async def test_memory_enhanced_chat():
    """测试记忆增强对话（快速版本）"""
    print("\n" + "=" * 60)
    print("测试 5: 记忆增强对话（快速版本）")
    print("=" * 60)
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # 直接测试记忆检索功能（不等待向量化）
        print("测试记忆检索功能...")
        chat_response = await client.post(
            f"{BASE_URL}/chat",
            json={
                "message": "你好，测试一下记忆功能",
                "retrieve_memories": True
            }
        )
        
        print(f"状态码: {chat_response.status_code}")
        result = chat_response.json()
        print(f"响应: {result.get('response', '')}")
        print(f"使用记忆数: {result.get('memories_used', 0)}")
        
        if chat_response.status_code == 200:
            print("✓ 记忆增强对话接口测试通过")
            print("  注意：实际记忆检索需要先存储记忆并等待向量化（30+ 秒）")
        else:
            print(f"✗ 记忆增强对话测试失败: {result}")


async def main():
    """运行所有测试"""
    print("=" * 60)
    print("Chat 接口测试")
    print("=" * 60)
    print(f"服务地址: {BASE_URL}")
    print("=" * 60)
    
    try:
        # 测试服务是否运行
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{BASE_URL}/")
            if response.status_code != 200:
                print(f"✗ 服务未运行或无法访问: {BASE_URL}")
                return
        
        # 运行测试
        await test_basic_chat()
        await test_chat_with_history()
        await test_different_personalities()
        await test_stream_chat()
        
        # 记忆增强测试（可选，需要较长时间）
        print("\n" + "=" * 60)
        print("是否运行记忆增强测试？（需要 30+ 秒）")
        print("=" * 60)
        # 自动运行
        await test_memory_enhanced_chat()
        
        print("\n" + "=" * 60)
        print("测试总结")
        print("=" * 60)
        print("✓ Chat 接口测试完成")
        
    except httpx.ConnectError:
        print(f"\n✗ 无法连接到服务: {BASE_URL}")
        print("请确保 memU-server 正在运行")
    except Exception as e:
        print(f"\n✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
