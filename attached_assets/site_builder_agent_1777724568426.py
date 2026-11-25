#!/usr/bin/env python3
"""
Local LLM Site Builder Agent
Uses Hugging Face models to understand site setup and execute build commands
No API costs - runs entirely locally
"""

import os
import subprocess
import json
from pathlib import Path
from typing import Dict, List, Optional
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
import torch

class SiteBuilderAgent:
    def __init__(self, model_name: str = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"):
        """
        Initialize with TinyLlama - ultra-fast, lightweight model for site building.
        TinyLlama-1.1B: Only 1.1B params, runs smoothly on any hardware, ~2GB download
        Alternatives: 
        - "microsoft/Phi-3.5-mini-instruct" for better quality (3.8B, ~7GB)
        - "mistralai/Mistral-7B-Instruct-v0.2" for maximum capability (requires more RAM)
        """
        print(f"Loading model: {model_name}")
        print("First run will download ~2GB. Subsequent runs load from cache instantly.")
        
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Using device: {self.device}")
        
        # Load model and tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
        self.model = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
            device_map="auto" if self.device == "cuda" else None,
            trust_remote_code=True
        )
        
        if self.device == "cpu":
            self.model = self.model.to(self.device)
        
        # Create pipeline
        self.pipe = pipeline(
            "text-generation",
            model=self.model,
            tokenizer=self.tokenizer,
            max_new_tokens=2048,
            temperature=0.7,
            top_p=0.95,
            do_sample=True
        )
        
        self.conversation_history = []
        self.site_config = {}
        self.project_root = Path.cwd() / "generated_site"
        
    def create_system_prompt(self) -> str:
        """System prompt that teaches the LLM to be a site builder"""
        return """You are a site builder agent. Your job is to:
1. Understand the user's site requirements through conversation
2. Generate JSON commands to create the site structure
3. Execute shell commands to build and deploy the site

When you understand what needs to be built, respond with JSON commands in this format:
```json
{
  "action": "create_structure",
  "structure": {
    "directories": ["src", "public", "components"],
    "files": {
      "package.json": {...},
      "src/index.js": "content here",
      "public/index.html": "content here"
    }
  }
}
```

Or for shell commands:
```json
{
  "action": "execute",
  "commands": [
    "npm install",
    "npm run build"
  ]
}
```

Or to ask for clarification:
```json
{
  "action": "clarify",
  "question": "What framework would you like to use?"
}
```

Be concise and practical. Generate complete, working code."""

    def chat(self, user_message: str) -> Dict:
        """Process user message and return response with actions"""
        
        # Build conversation context
        context = self.create_system_prompt() + "\n\n"
        
        for msg in self.conversation_history[-5:]:  # Last 5 messages for context
            context += f"{msg['role']}: {msg['content']}\n"
        
        context += f"User: {user_message}\nAssistant:"
        
        # Generate response
        response = self.pipe(
            context,
            max_new_tokens=1024,
            return_full_text=False
        )[0]['generated_text']
        
        # Store in history
        self.conversation_history.append({"role": "User", "content": user_message})
        self.conversation_history.append({"role": "Assistant", "content": response})
        
        # Parse for JSON commands
        actions = self._extract_actions(response)
        
        return {
            "response": response,
            "actions": actions
        }
    
    def _extract_actions(self, text: str) -> List[Dict]:
        """Extract JSON action blocks from response"""
        actions = []
        
        # Look for JSON blocks
        if "```json" in text:
            blocks = text.split("```json")
            for block in blocks[1:]:
                json_text = block.split("```")[0].strip()
                try:
                    action = json.loads(json_text)
                    actions.append(action)
                except json.JSONDecodeError:
                    continue
        
        return actions
    
    def execute_action(self, action: Dict) -> str:
        """Execute an action and return result"""
        
        if action["action"] == "create_structure":
            return self._create_structure(action["structure"])
        
        elif action["action"] == "execute":
            return self._execute_commands(action["commands"])
        
        elif action["action"] == "clarify":
            return f"Question: {action['question']}"
        
        return "Unknown action"
    
    def _create_structure(self, structure: Dict) -> str:
        """Create directories and files"""
        results = []
        
        # Create project root
        self.project_root.mkdir(exist_ok=True)
        
        # Create directories
        for dir_path in structure.get("directories", []):
            full_path = self.project_root / dir_path
            full_path.mkdir(parents=True, exist_ok=True)
            results.append(f"Created directory: {dir_path}")
        
        # Create files
        for file_path, content in structure.get("files", {}).items():
            full_path = self.project_root / file_path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Convert dict content to JSON string
            if isinstance(content, dict):
                content = json.dumps(content, indent=2)
            
            full_path.write_text(content)
            results.append(f"Created file: {file_path}")
        
        return "\n".join(results)
    
    def _execute_commands(self, commands: List[str]) -> str:
        """Execute shell commands in project directory"""
        results = []
        
        for cmd in commands:
            try:
                result = subprocess.run(
                    cmd,
                    shell=True,
                    cwd=self.project_root,
                    capture_output=True,
                    text=True,
                    timeout=300
                )
                
                output = result.stdout if result.returncode == 0 else result.stderr
                status = "✓" if result.returncode == 0 else "✗"
                results.append(f"{status} {cmd}\n{output[:200]}")
                
            except subprocess.TimeoutExpired:
                results.append(f"✗ {cmd}\nTimeout after 5 minutes")
            except Exception as e:
                results.append(f"✗ {cmd}\nError: {str(e)}")
        
        return "\n".join(results)


def interactive_mode():
    """Run interactive chat mode"""
    print("=" * 60)
    print("LOCAL LLM SITE BUILDER")
    print("=" * 60)
    print("\nInitializing model (first run downloads ~7GB)...\n")
    
    agent = SiteBuilderAgent()
    
    print("\n✓ Ready! Describe your site and I'll build it.")
    print("Type 'quit' to exit, 'show' to see project structure\n")
    
    while True:
        user_input = input("\n🔨 You: ").strip()
        
        if not user_input:
            continue
        
        if user_input.lower() == "quit":
            break
        
        if user_input.lower() == "show":
            if agent.project_root.exists():
                print(f"\nProject structure at: {agent.project_root}")
                for item in agent.project_root.rglob("*"):
                    if item.is_file():
                        print(f"  {item.relative_to(agent.project_root)}")
            else:
                print("No project created yet")
            continue
        
        # Get response
        result = agent.chat(user_input)
        
        print(f"\n🤖 Agent: {result['response']}")
        
        # Execute actions
        if result['actions']:
            print("\n📋 Executing actions...")
            for action in result['actions']:
                print(f"\nAction: {action['action']}")
                output = agent.execute_action(action)
                print(output)


if __name__ == "__main__":
    interactive_mode()
