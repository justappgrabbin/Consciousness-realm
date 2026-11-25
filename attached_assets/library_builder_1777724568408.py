"""
YOU-N-I-VERSE Content Library Builder
Processes 3 input types: chunks, ZIP files, TAR files
"""

import json
import zipfile
import tarfile
import re
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional
import hashlib

class LibraryBuilder:
    def __init__(self, output_path: str = "./consciousness_library"):
        self.output_path = Path(output_path)
        self.output_path.mkdir(parents=True, exist_ok=True)
        self.chunks = []
        self.processed_files = set()
    
    # METHOD 1: Individual chunks
    def add_chunk_file(self, file_path: str):
        file_path = Path(file_path)
        if not file_path.exists():
            print(f"⚠️  File not found: {file_path}")
            return
        
        print(f"📄 Processing: {file_path.name}")
        
        if file_path.suffix == '.json':
            chunk = self._process_json(file_path)
        elif file_path.suffix in ['.txt', '.md']:
            chunk = self._process_text(file_path)
        else:
            print(f"⚠️  Unsupported: {file_path.suffix}")
            return
        
        if chunk:
            self.chunks.append(chunk)
            print(f"✅ Added: {chunk['id']}")
    
    def add_chunk_directory(self, directory_path: str):
        directory = Path(directory_path)
        if not directory.exists():
            print(f"⚠️  Directory not found: {directory}")
            return
        
        print(f"📁 Processing directory: {directory}")
        files = list(directory.glob("*.json")) + list(directory.glob("*.txt")) + list(directory.glob("*.md"))
        print(f"Found {len(files)} files")
        
        for file_path in files:
            self.add_chunk_file(str(file_path))
    
    # METHOD 2: ZIP files
    def add_zip_file(self, zip_path: str):
        zip_path = Path(zip_path)
        if not zip_path.exists():
            print(f"⚠️  ZIP not found: {zip_path}")
            return
        
        print(f"📦 Processing ZIP: {zip_path.name}")
        extract_dir = self.output_path / "temp" / zip_path.stem
        extract_dir.mkdir(parents=True, exist_ok=True)
        
        try:
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(extract_dir)
            self._process_directory(extract_dir)
        except Exception as e:
            print(f"⚠️  Failed: {e}")
    
    # METHOD 3: TAR files
    def add_tar_file(self, tar_path: str):
        tar_path = Path(tar_path)
        if not tar_path.exists():
            print(f"⚠️  TAR not found: {tar_path}")
            return
        
        print(f"📦 Processing TAR: {tar_path.name}")
        extract_dir = self.output_path / "temp" / tar_path.stem
        extract_dir.mkdir(parents=True, exist_ok=True)
        
        try:
            with tarfile.open(tar_path, 'r:*') as tar_ref:
                tar_ref.extractall(extract_dir)
            self._process_directory(extract_dir)
        except Exception as e:
            print(f"⚠️  Failed: {e}")
    
    def _process_directory(self, directory: Path):
        files = list(directory.rglob("*.json")) + list(directory.rglob("*.txt")) + list(directory.rglob("*.md"))
        print(f"   Found {len(files)} content files")
        for file_path in files:
            if str(file_path) not in self.processed_files:
                self.add_chunk_file(str(file_path))
    
    def _process_json(self, file_path: Path) -> Optional[Dict]:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if 'id' not in data:
                data['id'] = file_path.stem
            if 'title' not in data:
                data['title'] = file_path.stem.replace('_', ' ').title()
            if 'content' not in data:
                return None
            
            data['source_file'] = str(file_path)
            data = self._classify(data)
            return data
        except Exception as e:
            print(f"⚠️  Error: {e}")
            return None
    
    def _process_text(self, file_path: Path) -> Optional[Dict]:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if len(content.strip()) < 50:
                return None
            
            chunk = {
                'id': file_path.stem,
                'title': content.split('\n')[0].strip()[:100],
                'content': content,
                'source_file': str(file_path)
            }
            
            gate_match = re.search(r'Gate\s+(\d+)', content, re.IGNORECASE)
            if gate_match:
                chunk['gate'] = int(gate_match.group(1))
            
            return self._classify(chunk)
        except Exception as e:
            print(f"⚠️  Error: {e}")
            return None
    
    def _classify(self, chunk: Dict) -> Dict:
        content_lower = chunk['content'].lower()
        
        # Category
        if chunk.get('gate'):
            chunk['category'] = 'gate_teachings'
        elif 'channel' in content_lower:
            chunk['category'] = 'channel_mechanics'
        elif any(t in content_lower for t in ['manifestor', 'generator', 'projector']):
            chunk['category'] = 'type_guidance'
        else:
            chunk['category'] = 'general'
        
        # Topic
        if 'authority' in content_lower:
            chunk['topic'] = 'authority'
        elif 'relationship' in content_lower:
            chunk['topic'] = 'relationships'
        else:
            chunk['topic'] = 'general'
        
        chunk['word_count'] = len(chunk['content'].split())
        chunk['processed_at'] = datetime.now().isoformat()
        
        return chunk
    
    def build(self):
        if not self.chunks:
            print("⚠️  No chunks to build!")
            return
        
        print(f"\n🔨 Building library with {len(self.chunks)} chunks...")
        self._save()
        print(f"✅ Library built at: {self.output_path}")
    
    def _save(self):
        # Save chunks
        chunks_file = self.output_path / "chunks.json"
        with open(chunks_file, 'w', encoding='utf-8') as f:
            json.dump(self.chunks, f, indent=2, ensure_ascii=False)
        print(f"   ✅ Saved: {chunks_file}")
        
        # Save by category
        categories = {}
        for chunk in self.chunks:
            cat = chunk.get('category', 'general')
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(chunk)
        
        for category, chunks in categories.items():
            cat_file = self.output_path / f"{category}.json"
            with open(cat_file, 'w', encoding='utf-8') as f:
                json.dump(chunks, f, indent=2, ensure_ascii=False)
            print(f"   ✅ Saved: {category} ({len(chunks)} chunks)")

# USAGE EXAMPLE
if __name__ == "__main__":
    builder = LibraryBuilder()
    
    # Add your content
    # builder.add_chunk_directory("./content/gate_teachings")
    # builder.add_zip_file("./archives/ra_material.zip")
    # builder.add_tar_file("./archives/hd_complete.tar.gz")
    
    # Build
    # builder.build()
    
    print("\n📚 Library Builder Ready")
    print("Add your content sources, then call builder.build()")
