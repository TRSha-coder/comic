#!/usr/bin/env python3
"""
动漫数据抓取脚本
使用 Jikan API (MyAnimeList的非官方API)
"""

import requests
import json
import time
import os
from pathlib import Path

# API配置
BASE_URL = "https://api.jikan.moe/v4"
OUTPUT_DIR = Path(__file__).parent.parent / "comic" / "data"
OUTPUT_FILE = OUTPUT_DIR / "anime.json"

def fetch_top_anime(limit=50):
    """获取热门动漫列表"""
    anime_list = []
    page = 1
    
    print(f"正在从Jikan API获取动漫数据...")
    
    while len(anime_list) < limit:
        try:
            # 获取排名动漫
            url = f"{BASE_URL}/top/anime?page={page}&limit=25"
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if "data" not in data:
                print("API返回数据格式错误")
                break
            
            for anime in data["data"]:
                # 提取关键信息
                anime_info = {
                    "id": anime.get("mal_id"),
                    "title": anime.get("title", "Unknown"),
                    "title_english": anime.get("title_english"),
                    "title_japanese": anime.get("title_japanese"),
                    "images": {
                        "jpg": anime.get("images", {}).get("jpg", {}),
                        "webp": anime.get("images", {}).get("webp", {})
                    },
                    "synopsis": anime.get("synopsis"),
                    "type": anime.get("type"),
                    "episodes": anime.get("episodes"),
                    "status": anime.get("status"),
                    "rating": anime.get("rating"),
                    "score": anime.get("score"),
                    "rank": anime.get("rank"),
                    "popularity": anime.get("popularity"),
                    "studios": [s.get("name") for s in anime.get("studios", [])],
                    "genres": [g.get("name") for g in anime.get("genres", [])],
                    "demographics": [d.get("name") for d in anime.get("demographics", [])],
                    "duration": anime.get("duration"),
                    "rating": anime.get("rating"),
                    "source": anime.get("source"),
                    "aired": str(anime.get("aired", {})),
                    "url": anime.get("url")
                }
                
                anime_list.append(anime_info)
                
                if len(anime_list) >= limit:
                    break
            
            print(f"已获取 {len(anime_list)}/{limit} 个动漫")
            page += 1
            
            # 遵守API速率限制 (每秒1请求)
            time.sleep(1)
            
        except requests.exceptions.RequestException as e:
            print(f"请求失败: {e}")
            break
        except json.JSONDecodeError as e:
            print(f"JSON解析失败: {e}")
            break
    
    return anime_list[:limit]

def save_data(anime_list):
    """保存数据到JSON文件"""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    data = {
        "source": "Jikan API (MyAnimeList)",
        "query": "top anime",
        "count": len(anime_list),
        "items": anime_list
    }
    
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\n数据已保存到: {OUTPUT_FILE}")
    print(f"共 {len(anime_list)} 个动漫")

def main():
    """主函数"""
    print("=" * 50)
    print("动漫数据抓取脚本")
    print("=" * 50)
    
    # 创建输出目录
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # 获取动漫数据
    anime_list = fetch_top_anime(limit=50)
    
    if anime_list:
        # 保存数据
        save_data(anime_list)
        
        # 显示统计
        print("\n" + "=" * 50)
        print("抓取完成!")
        print("=" * 50)
        print(f"总数: {len(anime_list)}")
        print(f"文件: {OUTPUT_FILE}")
        
        # 显示前3个
        print("\n前3个动漫:")
        for i, anime in enumerate(anime_list[:3], 1):
            print(f"{i}. {anime['title']} (Score: {anime['score']})")
    else:
        print("未获取到数据")

if __name__ == "__main__":
    main()
