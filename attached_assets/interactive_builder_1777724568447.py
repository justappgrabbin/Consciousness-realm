#!/usr/bin/env python3
"""
Interactive Consciousness Builder CLI
Conversational interface for building and deploying consciousness apps
"""

import os
import sys
from pathlib import Path
from typing import List, Optional
import json

from consciousness_builder import (
    ConsciousnessBuilder, PatternLearner, GapAnalyzer, 
    QuestionGenerator, Synthesizer, Gap, Question
)
from deployment_packager import DeploymentPackager


class InteractiveCLI:
    """Conversational builder interface"""
    
    def __init__(self):
        self.builder = ConsciousnessBuilder()
        self.source_dir = None
        self.output_dir = None
        self.answers = {}
        
    def print_header(self):
        """Print welcome message"""
        print("\n" + "=" * 70)
        print("✨ CONSCIOUSNESS APP BUILDER")
        print("=" * 70)
        print("\nI'll learn from your code, fill gaps, and ask only when needed.")
        print("Drop your files and let's build something coherent.\n")
    
    def get_source_directory(self) -> Path:
        """Ask for source directory"""
        while True:
            path = input("📂 Where's your code? (drag folder or paste path): ").strip()
            
            # Clean up path (remove quotes, etc)
            path = path.strip('"').strip("'")
            
            source = Path(path).expanduser()
            
            if source.exists() and source.is_dir():
                self.source_dir = source
                print(f"✓ Found: {source}")
                return source
            else:
                print(f"⚠️  Directory not found: {path}")
                print("Try again or press Ctrl+C to exit.")
    
    def get_vision(self) -> Optional[str]:
        """Ask if user has a vision"""
        print("\n💭 Do you have a vision for what this should become?")
        print("   (Just hit Enter if you want me to figure it out)")
        
        vision = input("\nYour vision: ").strip()
        
        if vision:
            print(f"\n✓ Got it. Building toward: {vision[:60]}...")
            return vision
        else:
            print("\n✓ No problem, I'll infer from the code.")
            return None
    
    def analyze_and_learn(self):
        """Run pattern learning and gap analysis"""
        print("\n" + "─" * 70)
        print("PHASE 1: LEARNING YOUR PATTERNS")
        print("─" * 70)
        
        # Learn patterns
        self.builder.patterns = self.builder.learner.learn_from_codebase(self.source_dir)
        
        # Show what was learned
        self._display_learned_patterns()
        
        print("\n" + "─" * 70)
        print("PHASE 2: ANALYZING GAPS")
        print("─" * 70)
        
        # Analyze gaps
        analyzer = GapAnalyzer(self.builder.patterns)
        self.builder.gaps = analyzer.analyze(self.source_dir)
        
        # Separate auto-fillable from ambiguous
        auto_fillable = [g for g in self.builder.gaps if g.auto_fillable]
        ambiguous = [g for g in self.builder.gaps if not g.auto_fillable]
        
        print(f"\n📊 Found:")
        print(f"   ✓ {len(auto_fillable)} gaps I can fill automatically")
        print(f"   ❓ {len(ambiguous)} gaps that need your input")
        
        return auto_fillable, ambiguous
    
    def _display_learned_patterns(self):
        """Show key patterns learned"""
        if not self.builder.patterns:
            print("   No clear patterns detected yet.")
            return
        
        print(f"\n✓ Learned {len(self.builder.patterns)} patterns:")
        
        # Group by type
        by_type = {}
        for p in self.builder.patterns:
            by_type.setdefault(p.type, []).append(p)
        
        for ptype, patterns in by_type.items():
            print(f"\n   {ptype.upper()}:")
            for p in patterns[:3]:  # Show first 3 of each type
                print(f"      • {p.name}: {p.pattern}")
    
    def auto_fill_gaps(self, gaps: List[Gap]):
        """Automatically fill obvious gaps"""
        if not gaps:
            return
        
        print("\n" + "─" * 70)
        print("PHASE 3: AUTO-FILLING GAPS")
        print("─" * 70)
        
        synthesizer = Synthesizer(self.builder.patterns)
        
        filled = []
        for gap in gaps:
            try:
                fill = synthesizer.synthesize(gap)
                if fill:
                    filled.append((gap, fill))
                    print(f"\n✓ {gap.type}: {gap.description[:50]}")
                    if len(fill) < 200:
                        print(f"   → {fill[:100]}")
            except Exception as e:
                print(f"\n⚠️  Couldn't auto-fill {gap.type}: {e}")
        
        if filled:
            print(f"\n✓ Auto-filled {len(filled)} gaps")
            
            # Ask if user wants to see details
            show = input("\nShow all auto-fills? (y/N): ").strip().lower()
            if show == 'y':
                for gap, fill in filled:
                    print(f"\n{'='*60}")
                    print(f"Gap: {gap.description}")
                    print(f"Location: {gap.location}")
                    print(f"\nFill:\n{fill}")
    
    def ask_questions(self, gaps: List[Gap]):
        """Ask user about ambiguous gaps"""
        if not gaps:
            return
        
        print("\n" + "─" * 70)
        print("PHASE 4: CLARIFYING QUESTIONS")
        print("─" * 70)
        
        q_gen = QuestionGenerator(self.builder.patterns)
        questions = q_gen.generate_questions(gaps)
        
        if not questions:
            print("\n✓ No questions needed—everything's clear!")
            return
        
        print(f"\n❓ I need clarity on {len(questions)} things:\n")
        
        for i, q in enumerate(questions, 1):
            print(f"\n[{i}/{len(questions)}] {q.question}")
            print(f"    Context: {q.context}")
            
            for j, opt in enumerate(q.options, 1):
                print(f"    {j}) {opt}")
            
            # Get answer
            while True:
                answer = input(f"\nYour choice (1-{len(q.options)}): ").strip()
                try:
                    choice = int(answer)
                    if 1 <= choice <= len(q.options):
                        self.answers[q.id] = q.options[choice - 1]
                        print(f"✓ Got it: {q.options[choice - 1]}")
                        break
                except ValueError:
                    pass
                print("Invalid choice, try again.")
        
        print(f"\n✓ All questions answered. Processing...")
    
    def generate_deployment(self):
        """Generate deployment package"""
        print("\n" + "─" * 70)
        print("PHASE 5: DEPLOYMENT PACKAGING")
        print("─" * 70)
        
        self.output_dir = self.source_dir / "deployment_package"
        
        packager = DeploymentPackager(self.source_dir, self.output_dir)
        config = packager.analyze_deployment_needs()
        
        print("\n📦 Deployment Configuration:")
        print(f"   App Type: {config.app_type}")
        print(f"   Python: {config.python_version}")
        print(f"   Dependencies: {len(config.dependencies)}")
        print(f"   Port: {config.port}")
        
        # Ask for confirmation
        proceed = input("\nGenerate deployment package? (Y/n): ").strip().lower()
        
        if proceed != 'n':
            packager.package()
            
            print("\n" + "=" * 70)
            print("✨ BUILD COMPLETE")
            print("=" * 70)
            
            self._show_next_steps()
    
    def _show_next_steps(self):
        """Display next steps"""
        print("\n🚀 Next Steps:\n")
        print(f"1. Review the built app:")
        print(f"   cd {self.output_dir}")
        print(f"   ls -la\n")
        
        print(f"2. Deploy locally:")
        print(f"   ./deploy.sh\n")
        
        print(f"3. Or deploy to cloud:")
        print(f"   # See DEPLOYMENT.md for options\n")
        
        print(f"4. Access your app:")
        print(f"   http://localhost:5000\n")
    
    def save_session(self):
        """Save session data for learning"""
        session_data = {
            'source_dir': str(self.source_dir),
            'patterns_learned': len(self.builder.patterns),
            'gaps_found': len(self.builder.gaps),
            'questions_asked': len(self.answers),
            'answers': self.answers
        }
        
        session_file = Path.home() / ".consciousness_builder" / "last_session.json"
        session_file.parent.mkdir(exist_ok=True)
        
        with open(session_file, 'w') as f:
            json.dump(session_data, f, indent=2)
    
    def run(self):
        """Main interactive flow"""
        try:
            self.print_header()
            
            # Get source directory
            self.get_source_directory()
            
            # Get vision (optional)
            vision = self.get_vision()
            
            # Analyze and learn
            auto_fillable, ambiguous = self.analyze_and_learn()
            
            # Auto-fill obvious gaps
            self.auto_fill_gaps(auto_fillable)
            
            # Ask about ambiguous gaps
            self.ask_questions(ambiguous)
            
            # Generate deployment
            self.generate_deployment()
            
            # Save session
            self.save_session()
            
            print("\n✨ Session complete. Builder memory updated.\n")
            
        except KeyboardInterrupt:
            print("\n\n✋ Interrupted. Progress saved.")
            self.save_session()
            sys.exit(0)
        except Exception as e:
            print(f"\n⚠️  Error: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)


def main():
    """Entry point"""
    cli = InteractiveCLI()
    cli.run()


if __name__ == "__main__":
    main()
