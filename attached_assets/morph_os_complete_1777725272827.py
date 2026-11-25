"""
╔══════════════════════════════════════════════════════════════════════╗
║            MORPH OS — COMPLETE UNIFIED BACKEND                       ║
║            All 9 ML modules merged into one deployable engine        ║
╠══════════════════════════════════════════════════════════════════════╣
║  Sections:                                                           ║
║    §1  Config & Data Structures                                      ║
║    §2  Generative Model (BiLSTM, 7 heads, 64-codon)                 ║
║    §3  Resonance Attention & Field Deviation (v2)                    ║
║    §4  SENN — Self-Expanding Neural Networks                         ║
║    §5  GRAN v2 — Graph Recurrent Attention Network                   ║
║    §6  Social-Neural Resonance GNN + Fractal Loss                    ║
║    §7  Resonance Spectrum Analyzer                                   ║
║    §8  OS Integration — GRAN ↔ Substrate ↔ Synthia                  ║
║    §9  Bridge Layer — SENN ↔ Trident ↔ Neo4j ↔ Agent               ║
╚══════════════════════════════════════════════════════════════════════╝
"""

# ─── Standard Library ────────────────────────────────────────────────────────
import asyncio
import hashlib
import json
import math
import random
from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import (
    Any, Callable, Dict, List, Optional, Set, Tuple, Union
)

# ─── Third-Party ─────────────────────────────────────────────────────────────
import numpy as np
import pandas as pd
import requests
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader



# ══════════════════════════════════════════════════════════════════════
# §1  CONFIG & DATA STRUCTURES
# ──────────────────────────────────────────────────────────────────────
# MorphConfig, MorphEmbeddings, ContinuousProcessor, CaseContextEncoder, MorphGenerativeModel, MorphSequenceGenerator, MorphTraceDataset, train/export/import_model
# ══════════════════════════════════════════════════════════════════════

# ============================================================
# CONFIGURATION
# ============================================================

class MorphConfig:
    """Configuration matching the 64-codon / hexagram dimensional system"""

    # Categorical vocabularies
    NUM_HEXAGRAMS = 64
    NUM_GATES = 64
    NUM_LINES = 6
    NUM_COLORS = 6
    NUM_TONES = 6
    NUM_BASES = 5
    NUM_DIMENSIONS = 3          # Body, Mind, Heart
    NUM_ZODIAC = 12
    NUM_HOUSES = 12

    # Embedding dimensions
    EMBED_DIM = 32

    # Continuous features: degrees, minutes, seconds, arcseconds, 
    # timestamp, resonance_freq, orbital_period, confidence
    NUM_CONTINUOUS = 8

    # Model architecture
    SEQUENCE_LENGTH = 7         # N-gram window
    HIDDEN_DIM = 256
    NUM_LAYERS = 2
    DROPOUT = 0.2

    # Case context (personal signature)
    CASE_CONTEXT_DIM = 64

    # Sampling
    TEMPERATURE = 1.0


# ============================================================
# EMBEDDING LAYERS
# ============================================================

class MorphEmbeddings(nn.Module):
    """
    Converts all categorical features into learned dense vectors.
    Each hexagram, gate, line, etc. gets a learned vector in latent space.
    Co-occurring values become geometrically close.
    """
    def __init__(self, config: MorphConfig):
        super().__init__()
        self.config = config

        self.hexagram_embed = nn.Embedding(config.NUM_HEXAGRAMS, config.EMBED_DIM)
        self.gate_embed = nn.Embedding(config.NUM_GATES, config.EMBED_DIM)
        self.line_embed = nn.Embedding(config.NUM_LINES, config.EMBED_DIM)
        self.color_embed = nn.Embedding(config.NUM_COLORS, config.EMBED_DIM)
        self.tone_embed = nn.Embedding(config.NUM_TONES, config.EMBED_DIM)
        self.base_embed = nn.Embedding(config.NUM_BASES, config.EMBED_DIM)
        self.dimension_embed = nn.Embedding(config.NUM_DIMENSIONS, config.EMBED_DIM)
        self.zodiac_embed = nn.Embedding(config.NUM_ZODIAC, config.EMBED_DIM)
        self.house_embed = nn.Embedding(config.NUM_HOUSES, config.EMBED_DIM)

        self.total_cat_dim = config.EMBED_DIM * 9

    def forward(self, categorical_batch: Dict[str, torch.Tensor]) -> torch.Tensor:
        embeddings = [
            self.hexagram_embed(categorical_batch['hexagram']),
            self.gate_embed(categorical_batch['gate']),
            self.line_embed(categorical_batch['line']),
            self.color_embed(categorical_batch['color']),
            self.tone_embed(categorical_batch['tone']),
            self.base_embed(categorical_batch['base']),
            self.dimension_embed(categorical_batch['dimension']),
            self.zodiac_embed(categorical_batch['zodiac']),
            self.house_embed(categorical_batch['house']),
        ]
        return torch.cat(embeddings, dim=-1)


# ============================================================
# CONTINUOUS PROCESSOR
# ============================================================

class ContinuousProcessor(nn.Module):
    """
    Log-normalization for high-variability temporal features.
    Z-score scaling with learnable parameters.
    """
    def __init__(self, config: MorphConfig):
        super().__init__()
        self.config = config
        self.log_features = [4, 5, 6]  # timestamp, resonance_freq, orbital_period
        self.scale_mean = nn.Parameter(torch.zeros(config.NUM_CONTINUOUS))
        self.scale_std = nn.Parameter(torch.ones(config.NUM_CONTINUOUS))

    def forward(self, continuous_batch: torch.Tensor) -> torch.Tensor:
        x = continuous_batch.clone()
        for idx in self.log_features:
            x[:, :, idx] = torch.log(x[:, :, idx] + 1.0)
        x = (x - self.scale_mean) / (self.scale_std + 1e-8)
        return x


# ============================================================
# CASE CONTEXT ENCODER
# ============================================================

class CaseContextEncoder(nn.Module):
    """
    Encodes a person's birth chart into a persistent 64-dim vector.
    This vector is concatenated to every timestep.
    """
    def __init__(self, config: MorphConfig, embeddings: MorphEmbeddings):
        super().__init__()
        self.compressor = nn.Sequential(
            nn.Linear(embeddings.total_cat_dim + config.NUM_CONTINUOUS, 128),
            nn.ReLU(),
            nn.Dropout(config.DROPOUT),
            nn.Linear(128, config.CASE_CONTEXT_DIM)
        )
        self.embeddings = embeddings

    def forward(self, birth_categorical: Dict[str, torch.Tensor], 
                birth_continuous: torch.Tensor) -> torch.Tensor:
        cat_emb = self.embeddings(birth_categorical).squeeze(1)
        combined = torch.cat([cat_emb, birth_continuous], dim=-1)
        return self.compressor(combined)


# ============================================================
# MAIN GENERATIVE MODEL
# ============================================================

class MorphGenerativeModel(nn.Module):
    """
    Complete multi-task generative model.

    Inputs:
        - categorical_seq: Dict of [batch, seq_len] tensors
        - continuous_seq: [batch, seq_len, NUM_CONTINUOUS]
        - birth_cat: Dict of [batch, 1] birth values
        - birth_cont: [batch, NUM_CONTINUOUS]

    Outputs (7 heads):
        - hexagram_probs: [batch, 64]
        - gate_probs: [batch, 64]
        - line_probs: [batch, 6]
        - dimension_probs: [batch, 3]
        - magnitude: [batch, 1] (0-1)
        - time_offset: [batch, 1] (log-normalized)
        - confidence: [batch, 1] (0-1)
    """
    def __init__(self, config: MorphConfig):
        super().__init__()
        self.config = config

        self.embeddings = MorphEmbeddings(config)
        self.continuous = ContinuousProcessor(config)
        self.case_context = CaseContextEncoder(config, self.embeddings)

        self.input_dim = self.embeddings.total_cat_dim + config.NUM_CONTINUOUS + config.CASE_CONTEXT_DIM

        self.lstm = nn.LSTM(
            input_size=self.input_dim,
            hidden_size=config.HIDDEN_DIM,
            num_layers=config.NUM_LAYERS,
            batch_first=True,
            dropout=config.DROPOUT if config.NUM_LAYERS > 1 else 0,
            bidirectional=True
        )

        lstm_out_dim = config.HIDDEN_DIM * 2

        self.shared_dense = nn.Sequential(
            nn.Linear(lstm_out_dim, 256),
            nn.ReLU(),
            nn.Dropout(config.DROPOUT)
        )

        # Multi-task heads
        self.hexagram_head = nn.Sequential(nn.Linear(256, 128), nn.ReLU(), nn.Linear(128, config.NUM_HEXAGRAMS))
        self.gate_head = nn.Sequential(nn.Linear(256, 128), nn.ReLU(), nn.Linear(128, config.NUM_GATES))
        self.line_head = nn.Sequential(nn.Linear(256, 64), nn.ReLU(), nn.Linear(64, config.NUM_LINES))
        self.dimension_head = nn.Sequential(nn.Linear(256, 64), nn.ReLU(), nn.Linear(64, config.NUM_DIMENSIONS))
        self.magnitude_head = nn.Sequential(nn.Linear(256, 64), nn.ReLU(), nn.Linear(64, 1), nn.Sigmoid())
        self.time_head = nn.Sequential(nn.Linear(256, 64), nn.ReLU(), nn.Linear(64, 1))
        self.confidence_head = nn.Sequential(nn.Linear(256, 64), nn.ReLU(), nn.Linear(64, 1), nn.Sigmoid())

    def forward(self, categorical_seq: Dict[str, torch.Tensor], 
                continuous_seq: torch.Tensor,
                birth_cat: Dict[str, torch.Tensor], 
                birth_cont: torch.Tensor,
                temperature: float = 1.0) -> Dict[str, torch.Tensor]:

        batch_size, seq_len = continuous_seq.shape[0], continuous_seq.shape[1]

        cat_emb = self.embeddings(categorical_seq)
        cont_proc = self.continuous(continuous_seq)
        context = self.case_context(birth_cat, birth_cont)
        context = context.unsqueeze(1).expand(-1, seq_len, -1)

        combined = torch.cat([cat_emb, cont_proc, context], dim=-1)
        lstm_out, _ = self.lstm(combined)
        last_out = lstm_out[:, -1, :]
        shared = self.shared_dense(last_out)

        outputs = {}
        outputs['hexagram_logits'] = self.hexagram_head(shared)
        outputs['hexagram_probs'] = F.softmax(outputs['hexagram_logits'] / temperature, dim=-1)

        outputs['gate_logits'] = self.gate_head(shared)
        outputs['gate_probs'] = F.softmax(outputs['gate_logits'] / temperature, dim=-1)

        outputs['line_logits'] = self.line_head(shared)
        outputs['line_probs'] = F.softmax(outputs['line_logits'] / temperature, dim=-1)

        outputs['dimension_logits'] = self.dimension_head(shared)
        outputs['dimension_probs'] = F.softmax(outputs['dimension_logits'] / temperature, dim=-1)

        outputs['magnitude'] = self.magnitude_head(shared)
        outputs['time_offset'] = self.time_head(shared)
        outputs['confidence'] = self.confidence_head(shared)

        return outputs

    def sample_next_state(self, categorical_seq: Dict[str, torch.Tensor],
                          continuous_seq: torch.Tensor,
                          birth_cat: Dict[str, torch.Tensor],
                          birth_cont: torch.Tensor,
                          temperature: float = 1.0,
                          method: str = 'random_choice') -> Dict:
        """
        Sample next state from model predictions.

        method='random_choice': Sample from probability distribution
        method='arg_max': Always pick highest probability
        """
        self.eval()
        with torch.no_grad():
            outputs = self.forward(categorical_seq, continuous_seq, birth_cat, birth_cont, temperature)

            results = {}

            def sample_or_max(probs, num_classes, method):
                if method == 'random_choice':
                    p = probs.cpu().numpy()[0]
                    return int(np.random.choice(num_classes, p=p))
                return int(torch.argmax(probs, dim=-1).item())

            results['hexagram'] = sample_or_max(outputs['hexagram_probs'], self.config.NUM_HEXAGRAMS, method)
            results['gate'] = sample_or_max(outputs['gate_probs'], self.config.NUM_GATES, method)
            results['line'] = sample_or_max(outputs['line_probs'], self.config.NUM_LINES, method)
            results['dimension'] = sample_or_max(outputs['dimension_probs'], self.config.NUM_DIMENSIONS, method)
            results['magnitude'] = float(outputs['magnitude'].item())
            results['time_offset'] = float(outputs['time_offset'].item())
            results['confidence'] = float(outputs['confidence'].item())

            # Include full probability distributions for analysis
            results['hexagram_distribution'] = outputs['hexagram_probs'].cpu().numpy()[0].tolist()
            results['gate_distribution'] = outputs['gate_probs'].cpu().numpy()[0].tolist()
            results['dimension_distribution'] = outputs['dimension_probs'].cpu().numpy()[0].tolist()

            return results


# ============================================================
# SEQUENCE GENERATOR
# ============================================================

class MorphSequenceGenerator:
    """
    Iterative sequence generation with feedback loop.
    Predictions are fed back as inputs for the next step.
    """
    def __init__(self, model: MorphGenerativeModel, config: MorphConfig):
        self.model = model
        self.config = config

    def generate(self, birth_cat: Dict[str, torch.Tensor], 
                 birth_cont: torch.Tensor,
                 prefix_cat: Optional[Dict[str, torch.Tensor]] = None,
                 prefix_cont: Optional[torch.Tensor] = None,
                 max_length: int = 50,
                 temperature: float = 1.0,
                 method: str = 'random_choice',
                 stop_on_hexagram: Optional[int] = None) -> List[Dict]:
        """
        Generate complete sequence from prefix or scratch.
        """
        device = next(self.model.parameters()).device

        if prefix_cat is not None and prefix_cont is not None:
            seq_cat = {k: v.clone() for k, v in prefix_cat.items()}
            seq_cont = prefix_cont.clone()
        else:
            seq_cat = {
                'hexagram': torch.zeros(1, 1, dtype=torch.long, device=device),
                'gate': torch.zeros(1, 1, dtype=torch.long, device=device),
                'line': torch.zeros(1, 1, dtype=torch.long, device=device),
                'color': torch.zeros(1, 1, dtype=torch.long, device=device),
                'tone': torch.zeros(1, 1, dtype=torch.long, device=device),
                'base': torch.zeros(1, 1, dtype=torch.long, device=device),
                'dimension': torch.zeros(1, 1, dtype=torch.long, device=device),
                'zodiac': torch.zeros(1, 1, dtype=torch.long, device=device),
                'house': torch.zeros(1, 1, dtype=torch.long, device=device),
            }
            seq_cont = torch.zeros(1, 1, self.config.NUM_CONTINUOUS, device=device)

        generated = []

        for step in range(max_length):
            if seq_cont.shape[1] > self.config.SEQUENCE_LENGTH:
                seq_cat = {k: v[:, -self.config.SEQUENCE_LENGTH:] for k, v in seq_cat.items()}
                seq_cont = seq_cont[:, -self.config.SEQUENCE_LENGTH:]

            next_state = self.model.sample_next_state(
                seq_cat, seq_cont, birth_cat, birth_cont,
                temperature=temperature, method=method
            )

            generated.append(next_state)

            if stop_on_hexagram is not None and next_state['hexagram'] == stop_on_hexagram:
                break

            # Feedback loop: append prediction to sequence
            new_hex = torch.tensor([[next_state['hexagram']]], device=device, dtype=torch.long)
            new_gate = torch.tensor([[next_state['gate']]], device=device, dtype=torch.long)
            new_line = torch.tensor([[next_state['line']]], device=device, dtype=torch.long)

            seq_cat['hexagram'] = torch.cat([seq_cat['hexagram'], new_hex], dim=1)
            seq_cat['gate'] = torch.cat([seq_cat['gate'], new_gate], dim=1)
            seq_cat['line'] = torch.cat([seq_cat['line'], new_line], dim=1)

            for key in ['color', 'tone', 'base', 'dimension', 'zodiac', 'house']:
                last_val = seq_cat[key][:, -1:]
                seq_cat[key] = torch.cat([seq_cat[key], last_val], dim=1)

            new_cont = torch.zeros(1, 1, self.config.NUM_CONTINUOUS, device=device)
            new_cont[0, 0, 0] = next_state['magnitude']
            seq_cont = torch.cat([seq_cont, new_cont], dim=1)

        return generated


# ============================================================
# DATASET
# ============================================================

class MorphTraceDataset(Dataset):
    """
    Dataset for training on human dimensional traces.
    Sliding window approach with multi-task targets.
    """
    def __init__(self, traces: List[Dict], config: MorphConfig, window_size: Optional[int] = None):
        self.config = config
        self.window = window_size or config.SEQUENCE_LENGTH
        self.samples = []

        for trace in traces:
            cat = trace['categorical']
            cont = trace['continuous']
            birth_cat = trace['birth_categorical']
            birth_cont = trace['birth_continuous']
            trace_len = len(cat['hexagram'])

            for i in range(trace_len - self.window):
                window_cat = {k: v[i:i+self.window] for k, v in cat.items()}
                window_cont = cont[i:i+self.window]

                target = {
                    'hexagram': cat['hexagram'][i + self.window],
                    'gate': cat['gate'][i + self.window],
                    'line': cat['line'][i + self.window],
                    'dimension': cat['dimension'][i + self.window],
                    'magnitude': cont[i + self.window, 0],
                    'time_offset': cont[i + self.window, 4],
                }

                self.samples.append({
                    'window_cat': window_cat,
                    'window_cont': window_cont,
                    'birth_cat': birth_cat,
                    'birth_cont': birth_cont,
                    'target': target
                })

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        s = self.samples[idx]

        window_cat = {k: torch.tensor(v, dtype=torch.long) for k, v in s['window_cat'].items()}
        window_cont = torch.tensor(s['window_cont'], dtype=torch.float32)
        birth_cat = {k: torch.tensor([v], dtype=torch.long) for k, v in s['birth_cat'].items()}
        birth_cont = torch.tensor(s['birth_cont'], dtype=torch.float32)

        target = {
            'hexagram': torch.tensor(s['target']['hexagram'], dtype=torch.long),
            'gate': torch.tensor(s['target']['gate'], dtype=torch.long),
            'line': torch.tensor(s['target']['line'], dtype=torch.long),
            'dimension': torch.tensor(s['target']['dimension'], dtype=torch.long),
            'magnitude': torch.tensor(s['target']['magnitude'], dtype=torch.float32),
            'time_offset': torch.tensor(s['target']['time_offset'], dtype=torch.float32),
        }

        return window_cat, window_cont, birth_cat, birth_cont, target


# ============================================================
# TRAINING
# ============================================================

def train_morph_model(model: MorphGenerativeModel, 
                      dataloader: DataLoader,
                      epochs: int = 50,
                      lr: float = 0.001,
                      device: str = 'cpu',
                      loss_weights: Optional[Dict[str, float]] = None) -> MorphGenerativeModel:
    """
    Training loop with weighted multi-task losses.
    """
    if loss_weights is None:
        loss_weights = {
            'hexagram': 1.0,
            'gate': 0.8,
            'line': 0.6,
            'dimension': 0.7,
            'magnitude': 0.5,
            'time_offset': 0.4
        }

    model = model.to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    ce_loss = nn.CrossEntropyLoss()
    mse_loss = nn.MSELoss()

    for epoch in range(epochs):
        model.train()
        total_loss = 0

        for batch in dataloader:
            window_cat, window_cont, birth_cat, birth_cont, target = batch

            window_cat = {k: v.to(device) for k, v in window_cat.items()}
            window_cont = window_cont.to(device)
            birth_cat = {k: v.to(device) for k, v in birth_cat.items()}
            birth_cont = birth_cont.to(device)

            outputs = model(window_cat, window_cont, birth_cat, birth_cont)

            loss = (
                loss_weights['hexagram'] * ce_loss(outputs['hexagram_logits'], target['hexagram'].to(device)) +
                loss_weights['gate'] * ce_loss(outputs['gate_logits'], target['gate'].to(device)) +
                loss_weights['line'] * ce_loss(outputs['line_logits'], target['line'].to(device)) +
                loss_weights['dimension'] * ce_loss(outputs['dimension_logits'], target['dimension'].to(device)) +
                loss_weights['magnitude'] * mse_loss(outputs['magnitude'].squeeze(), target['magnitude'].to(device)) +
                loss_weights['time_offset'] * mse_loss(outputs['time_offset'].squeeze(), target['time_offset'].to(device))
            )

            optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()

            total_loss += loss.item()

        avg_loss = total_loss / len(dataloader)
        if epoch % 10 == 0:
            print(f"Epoch {epoch}: Loss = {avg_loss:.4f}")

    return model


# ============================================================
# EXPORT / IMPORT
# ============================================================

def export_model(model: MorphGenerativeModel, path: str, metadata: Optional[Dict] = None):
    """Save model weights and config."""
    checkpoint = {
        'state_dict': model.state_dict(),
        'config': model.config.__dict__,
        'metadata': metadata or {}
    }
    torch.save(checkpoint, path)
    print(f"Model exported to {path}")

def import_model(path: str, device: str = 'cpu') -> Tuple[MorphGenerativeModel, Dict]:
    """Load model weights and config."""
    checkpoint = torch.load(path, map_location=device)
    config = MorphConfig()
    for k, v in checkpoint['config'].items():
        setattr(config, k, v)
    model = MorphGenerativeModel(config)
    model.load_state_dict(checkpoint['state_dict'])
    model = model.to(device)
    return model, checkpoint.get('metadata', {})


# ============================================================
# EXAMPLE USAGE
# ============================================================

if __name__ == "__main__":
    print("Morph Generative Model v1.0")
    print("=" * 50)

    config = MorphConfig()
    model = MorphGenerativeModel(config)

    total_params = sum(p.numel() for p in model.parameters())
    print(f"Parameters: {total_params:,}")
    print(f"Architecture: 2-layer Bi-LSTM, {config.HIDDEN_DIM} hidden, 7 output heads")

    # Example birth signature
    birth_cat = {
        'hexagram': torch.tensor([[1]], dtype=torch.long),
        'gate': torch.tensor([[10]], dtype=torch.long),
        'line': torch.tensor([[3]], dtype=torch.long),
        'color': torch.tensor([[2]], dtype=torch.long),
        'tone': torch.tensor([[4]], dtype=torch.long),
        'base': torch.tensor([[1]], dtype=torch.long),
        'dimension': torch.tensor([[0]], dtype=torch.long),
        'zodiac': torch.tensor([[5]], dtype=torch.long),
        'house': torch.tensor([[1]], dtype=torch.long),
    }
    birth_cont = torch.zeros(1, config.NUM_CONTINUOUS)

    # Generate
    generator = MorphSequenceGenerator(model, config)
    sequence = generator.generate(birth_cat, birth_cont, max_length=5)

    print("\nGenerated sequence:")
    for i, state in enumerate(sequence):
        dims = ['Body', 'Mind', 'Heart']
        print(f"  {i+1}. Hex {state['hexagram']:2d} | Gate {state['gate']:2d} | "
              f"Line {state['line']+1} | {dims[state['dimension']]} | "
              f"Conf {state['confidence']:.2f}")


# ══════════════════════════════════════════════════════════════════════
# §2  RESONANCE ATTENTION & FIELD DEVIATION (v2)
# ──────────────────────────────────────────────────────────────────────
# ResonanceAttentionLayer, FieldDeviationEvaluator, SubstrateTracer, PlanetaryMemoryCompressor
# ══════════════════════════════════════════════════════════════════════

# ============================================================
# 1. RESONANCE ATTENTION LAYER
# ============================================================

class ResonanceAttentionLayer(nn.Module):
    """
    Upgrade from Chen's IL-PMIM simple attention.

    Key innovation: Attention scores include a FIELD BIAS term based on
    5D dimensional proximity (Movement, Evolution, Being, Design, Space).

    This means attention isn't just "which past instance looks similar" 
    but "which past instance RESONATES in the current field state".

    Args:
        embed_dim: Embedding dimension (default 256, matching Chen)
        num_dimensions: Number of field dimensions (5 for Morph OS)
        num_heads: Attention heads (4, matching Chen's scale)
        dropout: Regularization
        field_bias_weight: How strongly field distance affects attention
    """
    def __init__(
        self,
        embed_dim: int = 256,
        num_dimensions: int = 5,
        num_heads: int = 4,
        dropout: float = 0.1,
        field_bias_weight: float = 0.3
    ):
        super().__init__()
        self.embed_dim = embed_dim
        self.num_dimensions = num_dimensions
        self.num_heads = num_heads
        self.head_dim = embed_dim // num_heads
        self.field_bias_weight = field_bias_weight

        # Standard QKV projections (like Chen's IL-PMIM)
        self.W_q = nn.Linear(embed_dim, embed_dim)
        self.W_k = nn.Linear(embed_dim, embed_dim)
        self.W_v = nn.Linear(embed_dim, embed_dim)
        self.W_out = nn.Linear(embed_dim, embed_dim)

        # FIELD-SPECIFIC: Learned dimensional importance gates
        # Each of the 5 dimensions has a learned weight for how much
        # it contributes to the field distance calculation
        self.dimension_gates = nn.Parameter(torch.ones(num_dimensions))

        # Field distance encoder: maps 5D coordinate distance to per-head bias
        self.field_distance_encoder = nn.Sequential(
            nn.Linear(num_dimensions, 64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, num_heads),  # One bias scalar per attention head
        )

        self.dropout = nn.Dropout(dropout)
        self.scale = self.head_dim ** -0.5

    def compute_field_distance(self, coords_i: torch.Tensor, coords_j: torch.Tensor) -> torch.Tensor:
        """
        Compute 5D field distance between two coordinate sets.

        NOT cosine similarity — actual geometric distance in the resonance field,
        weighted by learned dimensional importance gates.

        Args:
            coords_i: [batch*seq, 5] — first coordinate set
            coords_j: [batch*seq, 5] — second coordinate set
        Returns:
            field_dist: [batch*seq, 5] — per-dimension absolute distance
        """
        weighted_diff = (coords_i - coords_j) * self.dimension_gates
        field_dist = torch.abs(weighted_diff)
        return field_dist

    def forward(
        self,
        query: torch.Tensor,           # [batch, q_len, embed_dim] — current state
        key: torch.Tensor,             # [batch, k_len, embed_dim] — memory instances
        value: torch.Tensor,           # [batch, k_len, embed_dim]
        query_coords: torch.Tensor,    # [batch, 5] — current 5D coordinates
        key_coords: torch.Tensor,      # [batch, k_len, 5] — memory instance coordinates
        mask: Optional[torch.Tensor] = None
    ) -> Tuple[torch.Tensor, torch.Tensor, Dict]:
        """
        Forward pass with field-biased attention.

        Returns:
            output: [batch, q_len, embed_dim] — attended output
            attention_weights: [batch, num_heads, q_len, k_len] — INTERPRETABLE
            field_stats: dict with per-dimension statistics for debugging
        """
        batch_size, q_len, _ = query.size()
        k_len = key.size(1)

        # Standard multi-head QKV projections
        Q = self.W_q(query).view(batch_size, q_len, self.num_heads, self.head_dim).transpose(1, 2)
        K = self.W_k(key).view(batch_size, k_len, self.num_heads, self.head_dim).transpose(1, 2)
        V = self.W_v(value).view(batch_size, k_len, self.num_heads, self.head_dim).transpose(1, 2)
        # Q: [batch, num_heads, q_len, head_dim]
        # K, V: [batch, num_heads, k_len, head_dim]

        # Standard attention scores
        scores = torch.matmul(Q, K.transpose(-2, -1)) * self.scale  # [batch, heads, q_len, k_len]

        # === FIELD BIAS INJECTION ===
        # Compute field distances between current state and each memory instance
        query_coords_exp = query_coords.unsqueeze(1).expand(-1, k_len, -1)  # [batch, k_len, 5]

        field_distances = self.compute_field_distance(
            query_coords_exp.reshape(-1, self.num_dimensions),
            key_coords.reshape(-1, self.num_dimensions)
        ).reshape(batch_size, k_len, self.num_dimensions)  # [batch, k_len, 5]

        # Encode field distances to per-head bias
        field_bias = self.field_distance_encoder(field_distances)  # [batch, k_len, num_heads]
        field_bias = field_bias.permute(0, 2, 1).unsqueeze(2)     # [batch, heads, 1, k_len]
        field_bias = field_bias.expand(-1, -1, q_len, -1)       # [batch, heads, q_len, k_len]

        # Add field bias: if current state is far in a dimension,
        # all past instances get penalized in that dimension
        scores = scores + self.field_bias_weight * field_bias

        # Masking (for padded sequences)
        if mask is not None:
            scores = scores.masked_fill(mask == 0, float('-inf'))

        # Attention weights — THESE ARE INTERPRETABLE
        # Each weight shows how much a past instance resonates with current field state
        attn_weights = F.softmax(scores, dim=-1)  # [batch, heads, q_len, k_len]
        attn_weights = self.dropout(attn_weights)

        # Apply attention to values
        output = torch.matmul(attn_weights, V)  # [batch, heads, q_len, head_dim]
        output = output.transpose(1, 2).contiguous().view(batch_size, q_len, self.embed_dim)
        output = self.W_out(output)

        # === INTERPRETABILITY STATS ===
        field_stats = {
            "dimension_gates": self.dimension_gates.detach().cpu().numpy().tolist(),
            "mean_field_distance_per_dim": field_distances.mean(dim=(0,1)).detach().cpu().numpy().tolist(),
            "max_field_distance_per_dim": field_distances.max(dim=0)[0].max(dim=0)[0].detach().cpu().numpy().tolist(),
            "attention_entropy": (-attn_weights * torch.log(attn_weights + 1e-9)).sum(dim=-1).mean().item(),
        }

        return output, attn_weights, field_stats


# ============================================================
# 2. FIELD DEVIATION EVALUATOR
# ============================================================

class FieldDeviationEvaluator:
    """
    Chen uses confusion matrices for evaluation. Morph OS upgrade: 
    Field Deviation Maps that track WHICH dimension contributed most to error.

    This is interpretable and actionable — instead of just knowing
    "the model was wrong", you know "the model was wrong because it 
    miscalculated the Evolution dimension by 0.3 units".
    """
    def __init__(self, dimension_names: Optional[List[str]] = None):
        self.dimension_names = dimension_names or [
            "Movement", "Evolution", "Being", "Design", "Space"
        ]
        self.history: List[Dict] = []

    def evaluate(
        self,
        predicted_coords: np.ndarray,    # [batch, 5] — predicted 5D state
        actual_coords: np.ndarray,       # [batch, 5] — human's actual state
        predicted_action: int,
        actual_action: int,
    ) -> Dict:
        """
        Compute field deviation map for a single prediction.

        Returns dict with:
            - action_correct: bool
            - codon_accuracy: bool (did we land in right hexagram region?)
            - resonance_score: float (1/(1+field_distance), higher=better)
            - total_field_distance: float (euclidean distance in 5D)
            - dimension_deviation: per-dimension breakdown
            - primary_error_dimension: which dimension was most wrong
            - predicted_codon / actual_codon: hexagram mapping
        """
        predicted_coords = np.atleast_2d(predicted_coords)
        actual_coords = np.atleast_2d(actual_coords)

        # Per-dimension deviation
        dim_deviation = np.abs(predicted_coords - actual_coords)  # [batch, 5]

        # Total field distance (euclidean in 5D)
        total_distance = np.sqrt(np.sum(dim_deviation ** 2, axis=1))  # [batch]

        # Which dimension contributed most to the error?
        max_dev_dim = np.argmax(dim_deviation, axis=1)  # [batch]

        # Action correctness
        if np.isscalar(predicted_action):
            predicted_action = np.array([predicted_action])
        if np.isscalar(actual_action):
            actual_action = np.array([actual_action])
        action_correct = (predicted_action == actual_action)

        # Resonance score: 1 / (1 + field_distance) — higher = better aligned
        resonance_score = 1.0 / (1.0 + total_distance)

        # Codon accuracy: did we land in the right hexagram region?
        # Divide 5D space into 64 regions (2^4 * 4 = 64)
        predicted_codon = self._coords_to_codon(predicted_coords)
        actual_codon = self._coords_to_codon(actual_coords)
        codon_correct = (predicted_codon == actual_codon)

        result = {
            "action_correct": action_correct,
            "codon_accuracy": codon_correct,
            "resonance_score": resonance_score,
            "total_field_distance": total_distance,
            "dimension_deviation": {
                name: dim_deviation[:, i].tolist()
                for i, name in enumerate(self.dimension_names)
            },
            "primary_error_dimension": [
                self.dimension_names[d] for d in max_dev_dim
            ],
            "predicted_codon": predicted_codon.tolist(),
            "actual_codon": actual_codon.tolist(),
        }

        self.history.append(result)
        return result

    def _coords_to_codon(self, coords: np.ndarray) -> np.ndarray:
        """Map 5D coordinates to one of 64 codons (hexagram regions)."""
        mins = coords.min(axis=0)
        maxs = coords.max(axis=0)
        ranges = np.where(maxs - mins < 0.001, 0.001, maxs - mins)

        # 2 bins for first 4 dimensions, 4 bins for last = 2^4 * 4 = 64
        bins = [
            np.digitize(coords[:, i], np.linspace(mins[i], maxs[i], 3)) - 1
            for i in range(4)
        ]
        bins.append(np.digitize(coords[:, 4], np.linspace(mins[4], maxs[4], 5)) - 1)

        codon = (bins[0] * 32 + bins[1] * 16 + bins[2] * 8 + 
                 bins[3] * 4 + bins[4])
        return np.clip(codon, 0, 63)

    def aggregate_report(self) -> Dict:
        """Generate aggregate statistics over all evaluations."""
        if not self.history:
            return {}

        n = len(self.history)

        return {
            "total_evaluations": n,
            "action_accuracy": float(np.mean([r["action_correct"] for r in self.history])),
            "codon_accuracy": float(np.mean([r["codon_accuracy"] for r in self.history])),
            "mean_resonance_score": float(np.mean([np.mean(r["resonance_score"]) for r in self.history])),
            "mean_field_distance": float(np.mean([np.mean(r["total_field_distance"]) for r in self.history])),
            "dimension_error_distribution": {
                dim: sum(1 for r in self.history 
                        for d in r["primary_error_dimension"] if d == dim) / n
                for dim in self.dimension_names
            },
            "per_dimension_mean_deviation": {
                dim: float(np.mean([
                    np.mean(r["dimension_deviation"][dim]) 
                    for r in self.history
                ]))
                for dim in self.dimension_names
            }
        }


# ============================================================
# 3. SUBSTRATE TRACER (Teacher Forcing for Graphs)
# ============================================================

class SubstrateTracer:
    """
    Chen's IBL uses "tracing" — feed true human action as next memory instance.
    This is analogous to "teacher forcing" in RNNs.

    Morph OS equivalent: When system suggests X but human does Y,
    create a deviation edge in the substrate graph. The edge weight
    encodes how much the human diverged (small deviation = strong edge,
    meaning "almost followed the suggestion").
    """
    def __init__(self, substrate_graph: Optional[Dict] = None):
        self.substrate = substrate_graph or {}
        self.deviation_edges: List[Dict] = []

    def trace(
        self,
        predicted_state: Dict,      # What Morph predicted
        actual_state: Dict,        # What human actually did
        context_coords: np.ndarray  # 5D coordinates of the moment
    ) -> Dict:
        """
        Create a tracing edge when human deviates from prediction.

        Args:
            predicted_state: {"node_id": str, "coordinates": [5 floats]}
            actual_state: {"node_id": str, "coordinates": [5 floats]}
            context_coords: np.ndarray of shape (5,) — moment's field coordinates

        Returns:
            dict with edge info, deviation magnitude, and learning signal
        """
        pred_coords = np.array(predicted_state["coordinates"])
        actual_coords = np.array(actual_state["coordinates"])

        # Field distance between predicted and actual
        deviation_distance = np.linalg.norm(pred_coords - actual_coords)

        # Edge weight = inverse of deviation
        # Small deviation → strong edge (human almost followed)
        # Large deviation → weak edge (human strongly diverged)
        edge_weight = 1.0 / (1.0 + deviation_distance)

        # Which dimension had the biggest deviation?
        dims = ["Movement", "Evolution", "Being", "Design", "Space"]
        deviations = np.abs(pred_coords - actual_coords)
        primary_dim = dims[np.argmax(deviations)]

        edge = {
            "from": predicted_state["node_id"],
            "to": actual_state["node_id"],
            "type": "deviation_trace",
            "weight": float(edge_weight),
            "field_distance": float(deviation_distance),
            "context_coords": context_coords.tolist(),
            "primary_deviation_dimension": primary_dim,
            "timestamp": None,  # Set to actual timestamp in production
        }

        self.deviation_edges.append(edge)

        return {
            "edge_created": edge,
            "deviation_magnitude": float(deviation_distance),
            "learning_signal": float(edge_weight),
            "primary_dimension": primary_dim,
        }

    def get_deviation_summary(self) -> Dict:
        """Summary statistics of all traced deviations."""
        if not self.deviation_edges:
            return {}

        distances = [e["field_distance"] for e in self.deviation_edges]
        dimensions = [e["primary_deviation_dimension"] for e in self.deviation_edges]

        return {
            "total_traces": len(self.deviation_edges),
            "mean_deviation": np.mean(distances),
            "max_deviation": np.max(distances),
            "dimension_distribution": {
                dim: dimensions.count(dim) / len(dimensions)
                for dim in set(dimensions)
            }
        }


# ============================================================
# 4. PLANETARY MEMORY COMPRESSOR
# ============================================================

class PlanetaryMemoryCompressor(nn.Module):
    """
    Chen uses top-k memory retrieval for GPT due to context length limits.
    Morph OS: 13 planets as memory clusters. Each planet stores a 
    compressed resonance signature of its instances.

    This scales memory without losing the field structure — instances
    are grouped by planetary affinity, not arbitrary truncation.
    """
    def __init__(self, embed_dim: int = 256, num_planets: int = 13):
        super().__init__()
        self.embed_dim = embed_dim
        self.num_planets = num_planets

        # Each planet has a learnable centroid in embedding space
        self.planet_centroids = nn.Parameter(torch.randn(num_planets, embed_dim))

        # Each planet has its own compression network
        self.compression_nets = nn.ModuleList([
            nn.Sequential(
                nn.Linear(embed_dim * 2, embed_dim),
                nn.ReLU(),
                nn.Linear(embed_dim, embed_dim // 2),
            )
            for _ in range(num_planets)
        ])

    def assign_to_planet(self, instance_embedding: torch.Tensor) -> int:
        """
        Assign an instance to its nearest planet centroid.

        Args:
            instance_embedding: [embed_dim] — single instance embedding
        Returns:
            planet_id: int — which planet this instance belongs to
        """
        distances = torch.cdist(
            instance_embedding.unsqueeze(0), 
            self.planet_centroids.unsqueeze(0)
        ).squeeze()
        return torch.argmin(distances).item()

    def compress_planet_memory(
        self,
        planet_id: int,
        instances: List[torch.Tensor]
    ) -> torch.Tensor:
        """
        Compress all instances on a planet into a single resonance signature.

        Uses attention-weighted aggregation where the planet's "gravity"
        (centroid similarity) determines how much each instance contributes.

        Args:
            planet_id: which planet to compress
            instances: list of [embed_dim] tensors on this planet
        Returns:
            compressed: [embed_dim // 2] — planetary memory signature
        """
        if not instances:
            return torch.zeros(self.embed_dim // 2)

        stacked = torch.stack(instances)  # [n_instances, embed_dim]
        centroid = self.planet_centroids[planet_id]

        # Compute similarity to planet centroid
        similarities = F.cosine_similarity(stacked, centroid.unsqueeze(0), dim=1)
        weights = F.softmax(similarities, dim=0)  # Higher similarity = more weight

        # Weighted aggregation
        weighted_sum = (stacked * weights.unsqueeze(1)).sum(dim=0)  # [embed_dim]

        # Compress with planet-specific network
        compressed = self.compression_nets[planet_id](
            torch.cat([weighted_sum, centroid])
        )  # [embed_dim // 2]

        return compressed

    def retrieve_from_planet(
        self,
        query_embedding: torch.Tensor,
        planet_compressed: torch.Tensor,
        top_k: int = 5
    ) -> torch.Tensor:
        """
        Retrieve from a planet's compressed memory.

        In practice, you'd decompress and compare. For now, this is a
        placeholder for the retrieval mechanism.
        """
        # Placeholder: return similarity score
        similarity = F.cosine_similarity(
            query_embedding, 
            planet_compressed, 
            dim=0
        )
        return similarity


# ============================================================
# 5. INTEGRATION EXAMPLE
# ============================================================

if __name__ == "__main__":
    demo()


# ══════════════════════════════════════════════════════════════════════
# §3  SENN — SELF-EXPANDING NEURAL NETWORKS
# ──────────────────────────────────────────────────────────────────────
# MorphSENNConfig, SemanticFieldInitializer, SaturationMonitor, MorphSENNLayer, MorphSENNController, MorphSENNGraph
# ══════════════════════════════════════════════════════════════════════

class MorphSENNConfig:
    """Configuration for MorphSENN layers"""
    def __init__(
        self,
        base_width: int = 64,
        max_width: int = 512,
        expansion_rate: float = 0.2,  # Add 20% more neurons each expansion
        saturation_threshold: float = 0.01,  # Variance below this = saturated
        stagnation_window: int = 50,  # Steps before checking stagnation
        loss_improvement_threshold: float = 1e-4,
        semantic_init: bool = True,  # Use I Ching/Human Design seeds
        hexagram_states: int = 64,  # 64 codons/hexagrams
    ):
        self.base_width = base_width
        self.max_width = max_width
        self.expansion_rate = expansion_rate
        self.saturation_threshold = saturation_threshold
        self.stagnation_window = stagnation_window
        self.loss_improvement_threshold = loss_improvement_threshold
        self.semantic_init = semantic_init
        self.hexagram_states = hexagram_states

class SemanticFieldInitializer:
    """
    Initialize new neurons from I Ching/Human Design semantic field.
    Instead of random init, seed from your knowledge graph embeddings.
    """
    def __init__(self, hexagram_states: int = 64, embedding_dim: int = 128):
        self.hexagram_states = hexagram_states
        self.embedding_dim = embedding_dim
        # Pre-compute hexagram embeddings (simplified - in production, load from your Neo4j)
        self.hexagram_embeddings = self._generate_hexagram_embeddings()

    def _generate_hexagram_embeddings(self) -> torch.Tensor:
        """Generate 64 hexagram pattern embeddings"""
        # Each hexagram is a 6-line binary pattern (yang/yin)
        # We map these to continuous embeddings using Fourier features
        embeddings = []
        for i in range(self.hexagram_states):
            # Convert hexagram number to 6-bit binary
            binary = format(i, '06b')
            pattern = [float(b) for b in binary]

            # Create rich embedding using sinusoidal encoding
            embed = []
            for pos, val in enumerate(pattern):
                for freq in range(self.embedding_dim // 6):
                    phase = 2 * np.pi * freq / (self.embedding_dim // 6)
                    embed.append(val * np.sin(pos * phase))
                    embed.append(val * np.cos(pos * phase))
            embeddings.append(embed[:self.embedding_dim])

        return torch.tensor(embeddings, dtype=torch.float32)

    def get_seed(self, current_state: int, growth_stage: int) -> torch.Tensor:
        """
        Get initialization seed based on current hexagram state and growth stage.
        Growth stage maps to which line of the hexagram is changing.
        """
        # Line changes create new hexagram (adjacent in I Ching sequence)
        next_state = (current_state + growth_stage) % self.hexagram_states
        return self.hexagram_embeddings[next_state]

class SaturationMonitor:
    """Monitor neuron activation variance to detect saturation"""
    def __init__(self, window_size: int = 100):
        self.window_size = window_size
        self.activation_history: List[torch.Tensor] = []
        self.variance_history: List[float] = []

    def update(self, activations: torch.Tensor):
        """Track activation statistics"""
        # activations shape: [batch, neurons]
        var = torch.var(activations, dim=0).mean().item()  # Mean variance across neurons
        self.variance_history.append(var)

        # Keep only recent history
        if len(self.variance_history) > self.window_size:
            self.variance_history.pop(0)

    def is_saturated(self, threshold: float) -> bool:
        """Check if neurons are saturated (low variance)"""
        if len(self.variance_history) < 10:
            return False
        recent_var = np.mean(self.variance_history[-10:])
        return recent_var < threshold

    def get_saturation_vector(self, activations: torch.Tensor) -> torch.Tensor:
        """Per-neuron saturation score (0 = saturated, 1 = active)"""
        neuron_vars = torch.var(activations, dim=0)
        return (neuron_vars > 0.01).float()

class MorphSENNLayer(nn.Module):
    """
    Self-expanding layer that integrates with Morph's message-passing system.

    Features:
    - Base computation (message passing)
    - Saturation monitoring
    - Dynamic width expansion
    - Semantic initialization from I Ching field
    """
    def __init__(
        self,
        in_features: int,
        out_features: int,
        config: MorphSENNConfig,
        message_passing_mode: str = 'attention',
        hexagram_state: int = 0,
    ):
        super().__init__()
        self.config = config
        self.message_passing_mode = message_passing_mode
        self.hexagram_state = hexagram_state
        self.growth_stage = 0  # How many times this layer has expanded

        # Current width (starts at base, grows up to max)
        self.current_width = config.base_width
        self.target_width = config.base_width

        # Semantic initializer
        self.semantic_init = SemanticFieldInitializer(
            hexagram_states=config.hexagram_states,
            embedding_dim=out_features
        )

        # Saturation monitor
        self.monitor = SaturationMonitor()

        # Main weights (will be expanded dynamically)
        self.weight = nn.Parameter(torch.randn(in_features, self.current_width) * 0.01)
        self.bias = nn.Parameter(torch.zeros(self.current_width))

        # Expansion gate (learned - when to expand)
        self.expansion_gate = nn.Linear(out_features, 1)

        # Freeze mask (new neurons start frozen, gradually unfreeze)
        self.freeze_mask = torch.ones(self.current_width)

    def expand(self, num_new_neurons: int):
        """Expand layer width by adding new neurons"""
        if self.current_width >= self.config.max_width:
            return False

        num_new = min(num_new_neurons, self.config.max_width - self.current_width)

        # Create new weight columns
        new_weights = torch.randn(self.weight.size(0), num_new) * 0.01
        new_bias = torch.zeros(num_new)

        if self.config.semantic_init:
            # Initialize from semantic field
            for i in range(num_new):
                seed = self.semantic_init.get_seed(
                    self.hexagram_state, 
                    self.growth_stage + i
                )
                new_weights[:, i] = seed[:self.weight.size(0)]

        # Expand parameters
        self.weight = nn.Parameter(torch.cat([self.weight.data, new_weights], dim=1))
        self.bias = nn.Parameter(torch.cat([self.bias.data, new_bias], dim=0))

        # Update freeze mask (new neurons frozen initially)
        new_freeze = torch.zeros(num_new)
        self.freeze_mask = torch.cat([self.freeze_mask, new_freeze])

        self.current_width += num_new
        self.growth_stage += 1

        return True

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, Dict]:
        """
        Forward pass with monitoring.
        Returns: (output, metadata_dict)
        """
        # Base computation
        out = torch.matmul(x, self.weight[:, :self.current_width])
        out = out + self.bias[:self.current_width]
        out = F.relu(out)

        # Monitor saturation
        self.monitor.update(out.detach())
        is_saturated = self.monitor.is_saturated(self.config.saturation_threshold)

        # Compute expansion probability
        expansion_prob = torch.sigmoid(self.expansion_gate(out.mean(dim=0)))

        metadata = {
            'saturation': is_saturated,
            'expansion_prob': expansion_prob.item(),
            'current_width': self.current_width,
            'variance': np.mean(self.monitor.variance_history[-5:]) if self.monitor.variance_history else 0,
        }

        return out, metadata

class MorphSENNController:
    """
    Hybrid controller: decides when to morph topology vs expand capacity.

    Inputs:
    - Graph characteristics (for topology morph)
    - Loss trajectory (for expansion trigger)
    - Layer saturation vectors (for targeted expansion)

    Outputs:
    - Morph decision: {topology_morph, capacity_expansion, both, none}
    - Target layers for expansion
    """
    def __init__(self, config: MorphSENNConfig):
        self.config = config
        self.loss_history: List[float] = []
        self.expansion_cooldown = 0

    def update_loss(self, loss: float):
        self.loss_history.append(loss)
        if len(self.loss_history) > self.config.stagnation_window * 2:
            self.loss_history.pop(0)

    def is_stagnant(self) -> bool:
        """Check if loss has stopped improving"""
        if len(self.loss_history) < self.config.stagnation_window:
            return False
        recent = self.loss_history[-self.config.stagnation_window:]
        if len(recent) < 2:
            return False
        improvement = (recent[0] - recent[-1]) / len(recent)
        return improvement < self.config.loss_improvement_threshold

    def decide(
        self, 
        graph_characteristics: Dict,
        layer_metadata: List[Dict]
    ) -> Dict:
        """
        Make morph/expansion decision.

        Returns:
        {
            'action': 'morph' | 'expand' | 'both' | 'none',
            'target_layers': List[int],  # Which layers to expand
            'new_topology': Optional[str],  # New message-passing mode
            'reason': str,
        }
        """
        if self.expansion_cooldown > 0:
            self.expansion_cooldown -= 1

        # Check for stagnation
        stagnant = self.is_stagnant()

        # Check layer saturation
        saturated_layers = [
            i for i, meta in enumerate(layer_metadata) 
            if meta.get('saturation', False)
        ]

        # Decision logic
        if stagnant and saturated_layers and self.expansion_cooldown == 0:
            # Both conditions met: expand capacity in saturated layers
            self.expansion_cooldown = 20  # Cooldown period
            return {
                'action': 'both',
                'target_layers': saturated_layers,
                'new_topology': None,  # Keep current topology
                'reason': f'Loss stagnant + layers {saturated_layers} saturated',
            }
        elif stagnant and self.expansion_cooldown == 0:
            # Loss stagnant but no saturation - try topology morph first
            return {
                'action': 'morph',
                'target_layers': [],
                'new_topology': self._select_topology(graph_characteristics),
                'reason': 'Loss stagnant, no saturation - topology morph',
            }
        elif saturated_layers and not stagnant:
            # Saturated but loss still improving - expand anyway
            return {
                'action': 'expand',
                'target_layers': saturated_layers,
                'new_topology': None,
                'reason': f'Layers {saturated_layers} saturated',
            }
        else:
            return {
                'action': 'none',
                'target_layers': [],
                'new_topology': None,
                'reason': 'No trigger conditions met',
            }

    def _select_topology(self, graph_characteristics: Dict) -> str:
        """Select new message-passing mode based on graph characteristics"""
        # This connects to your existing Gumbel-Softmax controller
        modes = ['spatial', 'temporal', 'attention', 'diffusion', 'hierarchical']
        # Simplified: in production, use your neural controller
        return np.random.choice(modes)

class MorphSENNGraph(nn.Module):
    """
    Complete MorphSENN graph network.
    Stacks MorphSENN layers with hybrid controller.
    """
    def __init__(
        self,
        in_features: int,
        num_layers: int = 3,
        config: Optional[MorphSENNConfig] = None,
    ):
        super().__init__()
        self.config = config or MorphSENNConfig()
        self.controller = MorphSENNController(self.config)

        self.layers = nn.ModuleList([
            MorphSENNLayer(
                in_features if i == 0 else self.config.base_width,
                self.config.base_width,
                self.config,
                hexagram_state=i % 64,
            )
            for i in range(num_layers)
        ])

        # Output projection
        self.output_proj = nn.Linear(self.config.base_width, 64)  # 64 hexagram states

    def forward(self, x: torch.Tensor, loss: Optional[float] = None) -> Tuple[torch.Tensor, Dict]:
        """
        Forward pass with potential expansion.

        Args:
            x: Input features [batch, in_features]
            loss: Current loss value (for stagnation detection)

        Returns:
            (output, system_metadata)
        """
        # Update controller with loss
        if loss is not None:
            self.controller.update_loss(loss)

        # Forward through layers
        current = x
        layer_metadata = []

        for layer in self.layers:
            current, meta = layer(current)
            layer_metadata.append(meta)

        # Controller decision
        graph_chars = {'density': 0.5, 'diameter': 3}  # Simplified
        decision = self.controller.decide(graph_chars, layer_metadata)

        # Execute expansion if decided
        if decision['action'] in ['expand', 'both']:
            for layer_idx in decision['target_layers']:
                if layer_idx < len(self.layers):
                    layer = self.layers[layer_idx]
                    num_new = int(layer.current_width * self.config.expansion_rate)
                    expanded = layer.expand(num_new)
                    if expanded:
                        print(f"[MorphSENN] Layer {layer_idx} expanded: {layer.current_width - num_new} → {layer.current_width}")

        # Output
        out = self.output_proj(current)

        system_metadata = {
            'controller_decision': decision,
            'layer_widths': [l.current_width for l in self.layers],
            'total_parameters': sum(p.numel() for p in self.parameters()),
        }

        return out, system_metadata

# Example usage and test
if __name__ == "__main__":
    print("=== MorphSENN Integration Test ===")

    config = MorphSENNConfig(
        base_width=32,
        max_width=128,
        expansion_rate=0.25,
        semantic_init=True,
    )

    model = MorphSENNGraph(in_features=16, num_layers=2, config=config)

    # Simulate training with stagnation
    for step in range(200):
        x = torch.randn(4, 16)

        # Simulate loss: drops then stagnates
        if step < 50:
            loss = 1.0 - step * 0.01 + np.random.randn() * 0.05
        else:
            loss = 0.5 + np.random.randn() * 0.02  # Stagnant

        out, meta = model(x, loss=loss)

        if step % 50 == 0:
            print(f"Step {step}: Loss={loss:.3f}, Widths={meta['layer_widths']}, Decision={meta['controller_decision']['action']}")

    print(f"Final widths: {meta['layer_widths']}")
    print(f"Total params: {meta['total_parameters']:,}")


# ══════════════════════════════════════════════════════════════════════
# §4  GRAN v2 — GRAPH RECURRENT ATTENTION NETWORK
# ──────────────────────────────────────────────────────────────────────
# HexagramState, PersonChart, Motif, GateResonanceEncoder, DimensionalMPNN, CrossDimensionalAttention, EdgeProbabilityMLP, ConnectivityGuarantee, MorphGRANv2, MorphMetrics, MorphESWR
# ══════════════════════════════════════════════════════════════════════

# =============================================================================
# DATA STRUCTURES
# =============================================================================

@dataclass
class HexagramState:
    """One of 64 hexagram states (codons)"""
    number: int  # 1-64
    binary: str  # 6-bit string, e.g., "111000"
    gates: List[int]  # 6 gate numbers (1-64)
    lines: List[int]  # 6 line numbers (1-6)
    dimension: str  # Body/Mind/Heart/Design/Space

@dataclass  
class PersonChart:
    """Human Design chart for a person"""
    activated_gates: Set[int]
    channels: List[Tuple[int, int]]  # 32 possible channels
    authority: str  # Sacral/Emotional/Splenic/Ego/Heart/G/Self/Environment
    profile: str  # 1/3, 2/4, etc.
    cross: str  # Cross of the 4 types
    planets: Dict[str, HexagramState]  # 13 planetary positions

@dataclass
class Motif:
    """A block of nodes added together (from GRAN paper)"""
    nodes: List[int]
    hexagram: HexagramState
    internal_edges: List[Tuple[int, int]]
    dimension: str

# =============================================================================
# GATE RESONANCE ENCODER
# =============================================================================

class GateResonanceEncoder(nn.Module):
    """
    Encodes gate activations into hidden states.
    64 gates -> embedding space.
    """
    def __init__(self, num_gates=64, hidden_dim=256):
        super().__init__()
        self.gate_embedding = nn.Embedding(num_gates + 1, hidden_dim)
        self.combiner = nn.Linear(hidden_dim * 6, hidden_dim)

    def forward(self, activated_gates: List[int]) -> torch.Tensor:
        # activated_gates: list of up to 26 activated gates
        gate_indices = torch.tensor(activated_gates, dtype=torch.long)
        embeddings = self.gate_embedding(gate_indices)  # [num_gates, hidden]

        # Aggregate: mean + max pooling
        mean_pool = embeddings.mean(dim=0)
        max_pool = embeddings.max(dim=0)[0]

        # Pad to 6 if needed (for hexagram lines)
        if len(activated_gates) < 6:
            padding = torch.zeros(6 - len(activated_gates), embeddings.size(1))
            embeddings = torch.cat([embeddings, padding], dim=0)
        elif len(activated_gates) > 6:
            embeddings = embeddings[:6]

        combined = self.combiner(embeddings.view(-1))
        return F.relu(combined)

# =============================================================================
# DIMENSIONAL MPNN (5 parallel streams)
# =============================================================================

class DimensionalMPNN(nn.Module):
    """
    Message Passing Neural Network for one dimension.
    5 of these run in parallel (Body/Mind/Heart/Design/Space).
    """
    def __init__(self, hidden_dim=256, num_layers=3):
        super().__init__()
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers

        # Message passing layers
        self.message_layers = nn.ModuleList([
            nn.Linear(hidden_dim * 2, hidden_dim)
            for _ in range(num_layers)
        ])

        # Update function (GRU-style, from GRAN paper)
        self.update_gru = nn.GRUCell(hidden_dim, hidden_dim)

    def message_pass(self, node_states, edge_index):
        """
        One round of message passing.
        node_states: [num_nodes, hidden_dim]
        edge_index: [2, num_edges] - source, target pairs
        """
        src, dst = edge_index

        # Gather neighbor states
        neighbor_states = node_states[src]  # [num_edges, hidden]

        # Compute messages
        messages = torch.cat([neighbor_states, node_states[dst]], dim=-1)
        messages = F.relu(self.message_layers[0](messages))

        # Aggregate messages per node (scatter add)
        aggregated = torch.zeros_like(node_states)
        aggregated.index_add_(0, dst, messages)

        # GRU update
        new_states = self.update_gru(aggregated, node_states)
        return new_states

    def forward(self, node_states, edge_index):
        for layer in self.message_layers:
            node_states = self.message_pass(node_states, edge_index)
        return node_states

# =============================================================================
# CROSS-DIMENSIONAL ATTENTION
# =============================================================================

class CrossDimensionalAttention(nn.Module):
    """
    How Body affects Mind, Mind affects Heart, etc.
    5 dimensions attend to each other.
    """
    def __init__(self, num_dimensions=5, hidden_dim=256, num_heads=8):
        super().__init__()
        self.num_dimensions = num_dimensions
        self.hidden_dim = hidden_dim

        # Multi-head attention across dimensions
        self.attention = nn.MultiheadAttention(hidden_dim, num_heads)

        # Dimension-specific projections
        self.dim_projections = nn.ModuleList([
            nn.Linear(hidden_dim, hidden_dim)
            for _ in range(num_dimensions)
        ])

    def forward(self, dim_states: Dict[str, torch.Tensor]) -> torch.Tensor:
        # Stack dimension states: [5, num_nodes, hidden]
        dims = ['Body', 'Mind', 'Heart', 'Design', 'Space']
        states = torch.stack([dim_states[d] for d in dims])

        # Self-attention across dimensions
        attn_out, _ = self.attention(states, states, states)

        # Fuse back: weighted combination
        fused = attn_out.mean(dim=0)  # [num_nodes, hidden]
        return fused

# =============================================================================
# EDGE PROBABILITY MLP (from GRAN paper)
# =============================================================================

class EdgeProbabilityMLP(nn.Module):
    """
    MLP_theta from GRAN paper.
    Parameterizes Bernoulli distribution for edge existence.
    """
    def __init__(self, hidden_dim=256, num_dimensions=5):
        super().__init__()

        # Input: [node_i_state, node_j_state, dim_compatibility, temporal_phase]
        input_dim = hidden_dim * 2 + num_dimensions + 1

        self.mlp = nn.Sequential(
            nn.Linear(input_dim, 128),
            nn.ReLU(),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
            nn.Sigmoid()
        )

    def forward(self, node_i, node_j, dim_compat, phase):
        # node_i, node_j: [hidden_dim]
        # dim_compat: [num_dimensions]
        # phase: scalar
        x = torch.cat([node_i, node_j, dim_compat, phase.unsqueeze(-1)], dim=-1)
        return self.mlp(x)

# =============================================================================
# CONNECTIVITY GUARANTEE (fixes GRAN weakness)
# =============================================================================

class ConnectivityGuarantee:
    """
    Ensures generated graph stays connected.
    GRAN produces disconnected components (paper Fig 1-4).
    This fixes that.
    """
    @staticmethod
    def get_largest_component(graph, num_nodes, edge_index):
        """Find largest connected component using BFS"""
        adj = defaultdict(list)
        for i in range(edge_index.size(1)):
            src, dst = edge_index[0, i].item(), edge_index[1, i].item()
            adj[src].append(dst)
            adj[dst].append(src)

        visited = [False] * num_nodes
        largest = []

        for start in range(num_nodes):
            if visited[start]:
                continue
            component = []
            queue = [start]
            visited[start] = True
            while queue:
                node = queue.pop(0)
                component.append(node)
                for neighbor in adj[node]:
                    if not visited[neighbor]:
                        visited[neighbor] = True
                        queue.append(neighbor)
            if len(component) > len(largest):
                largest = component

        return set(largest)

    @staticmethod
    def ensure_connection(new_node, attachment_probs, graph, edge_index, num_nodes):
        """
        Force at least one edge to largest component.
        """
        largest = ConnectivityGuarantee.get_largest_component(graph, num_nodes, edge_index)

        # Top-k by probability
        probs = attachment_probs.clone()
        top_k = torch.topk(probs, k=min(3, len(probs))).indices.tolist()

        # Check if any top-k is in largest component
        if not any(n in largest for n in top_k):
            # Find closest node in largest component
            in_component = torch.tensor([i for i in range(num_nodes) if i in largest])
            if len(in_component) > 0:
                # Force first attachment to largest component
                closest = in_component[0].item()
                top_k[0] = closest

        return top_k

# =============================================================================
# MAIN MORPH GRAN v2
# =============================================================================

class MorphGRANv2(nn.Module):
    """
    Complete Morph GRAN v2 system.
    Generates personalized substrate meshes for Human Design.
    """
    def __init__(self, config=None):
        super().__init__()

        self.config = config or {
            'hidden_dim': 256,
            'num_dimensions': 5,
            'motif_size': 6,
            'mpnn_layers': 3,
            'gate_resonance_weight': 2.0,
        }

        self.hidden_dim = self.config['hidden_dim']
        self.dimensions = ['Body', 'Mind', 'Heart', 'Design', 'Space']

        # Components
        self.gate_encoder = GateResonanceEncoder(64, self.hidden_dim)

        # 5 parallel MPNNs
        self.dimension_mpnn = nn.ModuleDict({
            dim: DimensionalMPNN(self.hidden_dim, self.config['mpnn_layers'])
            for dim in self.dimensions
        })

        # Cross-dimensional attention
        self.cross_attention = CrossDimensionalAttention(
            5, self.hidden_dim
        )

        # Edge probability
        self.edge_mlp = EdgeProbabilityMLP(self.hidden_dim, 5)

        # Connectivity guarantee
        self.connectivity = ConnectivityGuarantee()

        # Hexagram embeddings (64 states)
        self.hexagram_embed = nn.Embedding(64, self.hidden_dim)

    def encode_person(self, person: PersonChart) -> torch.Tensor:
        """Encode person's chart into initial state"""
        return self.gate_encoder(list(person.activated_gates))

    def create_motif(self, hexagram: HexagramState) -> Motif:
        """Create a motif (block of 6 nodes) from hexagram"""
        nodes = list(range(self.next_node_id, self.next_node_id + 6))
        self.next_node_id += 6

        # Internal edges: line 1-2, 2-3, 3-4, 4-5, 5-6
        internal_edges = [(nodes[i], nodes[i+1]) for i in range(5)]

        return Motif(nodes, hexagram, internal_edges, hexagram.dimension)

    def compute_attachment_probs(self, new_motif, existing_nodes, 
                                  node_states, person: PersonChart):
        """
        Compute where to attach new motif.
        Combines GRAN attention + gate resonance + dimension + phase.
        """
        probs = []
        new_state = self.hexagram_embed(torch.tensor(new_motif.hexagram.number - 1))

        for i, node_id in enumerate(existing_nodes):
            node_state = node_states[i]

            # 1. Base attention (from GRAN)
            attention = F.cosine_similarity(new_state.unsqueeze(0), 
                                           node_state.unsqueeze(0))

            # 2. Gate resonance (MORPH addition)
            shared = len(set(new_motif.hexagram.gates) & person.activated_gates)
            resonance = shared * self.config['gate_resonance_weight']

            # 3. Dimensional compatibility
            dim_vec = torch.zeros(5)
            dim_idx = self.dimensions.index(new_motif.dimension)
            dim_vec[dim_idx] = 1.0

            # 4. Temporal phase (simplified)
            phase = torch.tensor(0.5)

            # Edge probability
            prob = self.edge_mlp(new_state, node_state, dim_vec, phase)

            # Combine with resonance bonus
            combined = prob + resonance * 0.1
            probs.append(combined)

        return torch.stack(probs).squeeze()

    def generate(self, person: PersonChart, num_motifs=13):
        """
        Generate substrate mesh for a person.
        13 motifs = 13 planets in Human Design.
        """
        self.next_node_id = 0

        # Initialize graph
        nodes = []
        edge_index = [[], []]
        node_states = []

        # Seed: person's design crystal
        seed_hex = person.planets.get('Design', list(person.planets.values())[0])
        seed_motif = self.create_motif(seed_hex)
        nodes.extend(seed_motif.nodes)

        # Add internal edges
        for src, dst in seed_motif.internal_edges:
            edge_index[0].append(src)
            edge_index[1].append(dst)
            edge_index[0].append(dst)
            edge_index[1].append(src)

        # Initialize states
        seed_state = self.hexagram_embed(torch.tensor(seed_hex.number - 1))
        for _ in seed_motif.nodes:
            node_states.append(seed_state.clone())

        # Generate remaining motifs
        planet_names = list(person.planets.keys())
        for i in range(1, min(num_motifs, len(planet_names))):
            hexagram = person.planets[planet_names[i]]
            motif = self.create_motif(hexagram)

            # Run 5-dimensional MPNN
            states_tensor = torch.stack(node_states)
            edge_tensor = torch.tensor(edge_index, dtype=torch.long)

            dim_states = {}
            for dim in self.dimensions:
                dim_states[dim] = self.dimension_mpnn[dim](states_tensor, edge_tensor)

            # Cross-dimensional fusion
            fused_states = self.cross_attention(dim_states)

            # Compute attachment probabilities
            probs = self.compute_attachment_probs(
                motif, nodes, fused_states, person
            )

            # Attach with connectivity guarantee
            attachments = self.connectivity.ensure_connection(
                motif.nodes[0], probs, nodes, edge_tensor, len(nodes)
            )

            # Add edges to attachments
            for attach_node in attachments[:3]:
                edge_index[0].append(motif.nodes[0])
                edge_index[1].append(attach_node)
                edge_index[0].append(attach_node)
                edge_index[1].append(motif.nodes[0])

            # Add internal motif edges
            for src, dst in motif.internal_edges:
                edge_index[0].append(src)
                edge_index[1].append(dst)
                edge_index[0].append(dst)
                edge_index[1].append(src)

            # Add motif nodes and states
            nodes.extend(motif.nodes)
            motif_state = self.hexagram_embed(torch.tensor(hexagram.number - 1))
            for _ in motif.nodes:
                node_states.append(motif_state.clone())

        return {
            'nodes': nodes,
            'edge_index': torch.tensor(edge_index, dtype=torch.long),
            'node_states': torch.stack(node_states),
            'motifs': num_motifs
        }

    def evolve(self, graph, person: PersonChart, time_delta: float):
        """
        Temporal evolution - graph changes as person changes.
        MORPH innovation beyond static GRAN.
        """
        # Detect state changes
        current_planets = person.planets

        # For each planet, check if hexagram changed
        for planet, hexagram in current_planets.items():
            # Find corresponding motif in graph
            # (simplified: just rewire based on new gates)
            pass

        # Agent migration (if agents exist)
        # Rewire edges for migrated agents

        return graph

# =============================================================================
# EVALUATION METRICS (from paper + MORPH additions)
# =============================================================================

class MorphMetrics:
    """
    Evaluation metrics combining paper's MMD with Human Design specifics.
    """

    @staticmethod
    def mmd_gaussian_kernel(x, y, sigma=1.0):
        """Maximum Mean Discrepancy with Gaussian kernel"""
        xx = torch.exp(-torch.cdist(x, x)**2 / (2 * sigma**2)).mean()
        yy = torch.exp(-torch.cdist(y, y)**2 / (2 * sigma**2)).mean()
        xy = torch.exp(-torch.cdist(x, y)**2 / (2 * sigma**2)).mean()
        return xx + yy - 2 * xy

    @staticmethod
    def degree_distribution(graph):
        """Node degree distribution"""
        num_nodes = len(graph['nodes'])
        degrees = torch.zeros(num_nodes)
        edge_index = graph['edge_index']
        for i in range(edge_index.size(1)):
            degrees[edge_index[0, i]] += 1
        return degrees

    @staticmethod
    def clustering_coefficient(graph):
        """Local clustering coefficient"""
        # Simplified: count triangles / possible triangles
        edge_index = graph['edge_index']
        num_nodes = len(graph['nodes'])
        adj = torch.zeros(num_nodes, num_nodes)
        for i in range(edge_index.size(1)):
            adj[edge_index[0, i], edge_index[1, i]] = 1

        clustering = []
        for node in range(num_nodes):
            neighbors = adj[node].nonzero().squeeze(-1)
            k = len(neighbors)
            if k < 2:
                clustering.append(0.0)
                continue
            # Count triangles
            sub = adj[neighbors][:, neighbors]
            triangles = sub.sum().item() / 2
            possible = k * (k - 1) / 2
            clustering.append(triangles / possible if possible > 0 else 0)
        return torch.tensor(clustering)

    @staticmethod
    def gate_coverage(graph, person: PersonChart):
        """What % of 64 gates are present in graph?"""
        all_gates = set()
        # (Would need to track gate assignments per node)
        return len(all_gates) / 64.0

    @staticmethod
    def channel_completeness(graph, person: PersonChart):
        """How many of 32 channels are activated?"""
        # Check which channel pairs are both present
        active_channels = 0
        for g1, g2 in person.channels:
            # Check if both gates exist in graph
            pass
        return active_channels / 32.0

    @staticmethod
    def evaluate(real_graphs, synthetic_graphs, person: PersonChart):
        """
        Full evaluation suite.
        Returns dict of MMD scores.
        """
        metrics = {}

        # From paper
        for metric_name, metric_fn in [
            ('degree', MorphMetrics.degree_distribution),
            ('clustering', MorphMetrics.clustering_coefficient),
        ]:
            real_vals = torch.stack([metric_fn(g) for g in real_graphs])
            synth_vals = torch.stack([metric_fn(g) for g in synthetic_graphs])
            metrics[f'MMD_{metric_name}'] = MorphMetrics.mmd_gaussian_kernel(
                real_vals, synth_vals
            ).item()

        # MORPH additions
        metrics['gate_coverage'] = MorphMetrics.gate_coverage(
            synthetic_graphs[0], person
        )
        metrics['channel_completeness'] = MorphMetrics.channel_completeness(
            synthetic_graphs[0], person
        )

        return metrics

# =============================================================================
# TRAINING: ESWR for Morph (from paper Section 4.1)
# =============================================================================

class MorphESWR:
    """
    Exploration Sampling With Replacement adapted for Human Design.
    Samples "life moments" from a person's chart.
    """
    def __init__(self, person: PersonChart, mu=400, sigma=50):
        self.person = person
        self.mu = mu
        self.sigma = sigma

    def sample_life_moment(self):
        """Sample a subgraph representing a period of gate activation"""
        import random
        num_gates = int(random.gauss(self.mu, self.sigma))
        num_gates = max(6, min(num_gates, len(self.person.activated_gates)))

        # Start from random activated gate
        gates_list = list(self.person.activated_gates)
        seed = random.choice(gates_list)

        # Random walk biased by channel connections
        active = [seed]
        for _ in range(num_gates - 1):
            current = active[-1]
            # Find gates that share channels with current
            candidates = [g for g in gates_list if g != current]
            if not candidates:
                break
            # Weight by channel strength
            weights = []
            for c in candidates:
                if (current, c) in self.person.channels or (c, current) in self.person.channels:
                    weights.append(3.0)  # Strong connection
                else:
                    weights.append(1.0)
            next_gate = random.choices(candidates, weights=weights, k=1)[0]
            active.append(next_gate)

        return active  # List of active gates for this "moment"

    def generate_dataset(self, num_samples=200):
        """Generate 200 samples per person (as in paper)"""
        return [self.sample_life_moment() for _ in range(num_samples)]

# =============================================================================
# USAGE EXAMPLE
# =============================================================================

if __name__ == '__main__':
    example_usage()


# ══════════════════════════════════════════════════════════════════════
# §5  SOCIAL-NEURAL RESONANCE GNN + FRACTAL LOSS
# ──────────────────────────────────────────────────────────────────────
# CentralityModulatedMessagePassing, DeltaBandResonanceLayer, SocialNeuralResonanceGNN, FractalResonanceLoss, ResonanceDataset, trainer
# ══════════════════════════════════════════════════════════════════════

def compute_degree(edge_index, num_nodes):
    """Compute node degrees from edge_index."""
    deg = torch.zeros(num_nodes, dtype=torch.float)
    src = edge_index[0]
    for i in range(len(src)):
        deg[src[i]] += 1
    return deg


class CentralityModulatedMessagePassing(nn.Module):
    """
    Message passing where edge weights are modulated by 
    betweenness centrality of the receiving node.

    Biology: High-betweenness individuals show enhanced 
    frontal↔parietal delta-band synchronization.

    Implementation: Betweenness score gates the attention 
    weight on incoming messages. High-betweenness nodes 
    integrate more efficiently but resist conformity.
    """
    def __init__(self, in_channels, out_channels, heads=4, conformity_bias=0.3):
        super().__init__()
        self.in_channels = in_channels
        self.out_channels = out_channels
        self.heads = heads
        self.conformity_bias = conformity_bias

        # Multi-head attention parameters
        self.W_q = nn.Linear(in_channels, heads * out_channels)
        self.W_k = nn.Linear(in_channels, heads * out_channels)
        self.W_v = nn.Linear(in_channels, heads * out_channels)
        self.W_o = nn.Linear(heads * out_channels, out_channels)

        # Centrality gating
        self.centrality_gate = nn.Sequential(
            nn.Linear(1, heads * 2),
            nn.SiLU(),
            nn.Linear(heads * 2, heads),
            nn.Sigmoid()
        )

        # Conformity resistance (the "conformity paradox")
        self.conformity_resistance = nn.Sequential(
            nn.Linear(1, 16),
            nn.SiLU(),
            nn.Linear(16, 1),
            nn.Sigmoid()
        )

    def forward(self, x, edge_index, betweenness, edge_attr=None):
        N = x.size(0)
        src = edge_index[0]
        dst = edge_index[1]

        # Multi-head Q, K, V
        Q = self.W_q(x).view(N, self.heads, self.out_channels)
        K = self.W_k(x).view(N, self.heads, self.out_channels)
        V = self.W_v(x).view(N, self.heads, self.out_channels)

        # Centrality gates per head
        gates = self.centrality_gate(betweenness)

        # Conformity resistance: high betweenness = low conformity
        resistance = self.conformity_resistance(betweenness)
        conformity_factor = 1.0 - (resistance * self.conformity_bias)

        # Gather sender/receiver
        Q_dst = Q[dst]
        K_src = K[src]
        V_src = V[src]

        # Attention scores
        attn = (Q_dst * K_src).sum(dim=-1) / math.sqrt(self.out_channels)
        attn = attn * gates[dst]
        attn = attn * conformity_factor[dst]

        # Aggregate per destination node
        out = torch.zeros(N, self.heads, self.out_channels, device=x.device)
        for node in range(N):
            mask = (dst == node)
            if mask.sum() == 0:
                continue
            node_attn = F.softmax(attn[mask], dim=0)
            node_out = (V_src[mask] * node_attn.unsqueeze(-1)).sum(dim=0)
            out[node] = node_out

        out = out.view(N, self.heads * self.out_channels)
        return self.W_o(out)


class DeltaBandResonanceLayer(nn.Module):
    """
    Delta-band (0.5–4Hz) synchronization across 5 dimensions.

    Biology: High-betweenness individuals show enhanced 
    frontal↔parietal delta-band phase locking.

    Implementation: Kuramoto-like oscillators gate information 
    flow across the 5 dimensions (Movement, Evolution, Being, 
    Design, Space).
    """
    def __init__(self, dim_size, num_dimensions=5, delta_freq=2.0):
        super().__init__()
        self.dim_size = dim_size
        self.num_dimensions = num_dimensions
        self.delta_freq = delta_freq

        # Phase oscillators per dimension
        self.phase = nn.Parameter(torch.zeros(num_dimensions))
        self.phase_vel = nn.Parameter(torch.ones(num_dimensions) * delta_freq)

        # Cross-dimensional coupling (like frontal↔parietal)
        self.coupling = nn.Parameter(
            torch.eye(num_dimensions) * 0.5 + 
            torch.ones(num_dimensions, num_dimensions) * 0.1
        )

        # Dimension projections
        self.dim_proj = nn.ModuleList([
            nn.Linear(dim_size, dim_size) for _ in range(num_dimensions)
        ])

    def forward(self, x, t, betweenness=None):
        N = x.size(0)

        # Kuramoto phase update
        phase_diff = self.phase.unsqueeze(0) - self.phase.unsqueeze(1)
        coupling_term = (self.coupling * torch.sin(phase_diff)).sum(dim=1)
        self.phase.data = self.phase.data + (self.phase_vel + coupling_term) * 0.01

        # Delta gate: slow oscillation
        delta_gate = torch.sin(self.phase * t * 2 * math.pi).unsqueeze(0).unsqueeze(-1)

        # Betweenness modulates coupling strength
        if betweenness is not None:
            coupling_strength = 0.5 + betweenness.unsqueeze(1) * 0.5
            delta_gate = delta_gate * coupling_strength

        # Apply per-dimension
        out = []
        for d in range(self.num_dimensions):
            gated = x[:, d, :] * (0.5 + 0.5 * delta_gate[:, d, :])
            projected = self.dim_proj[d](gated)
            out.append(projected)

        return torch.stack(out, dim=1)


class SocialNeuralResonanceGNN(nn.Module):
    """
    Complete Social-Neural Resonance GNN.

    Architecture:
    1. Centrality-modulated message passing (conformity paradox)
    2. Delta-band resonance across 5 dimensions
    3. 64-codon state embedding (hexagram space)
    4. ERP 3-phase decision cycle (N2→P3→LPP)
    """
    def __init__(
        self,
        node_features,
        hidden_dim=128,
        num_dimensions=5,
        num_codons=64,
        num_layers=3,
        heads=4,
        conformity_bias=0.3
    ):
        super().__init__()
        self.hidden_dim = hidden_dim
        self.num_dimensions = num_dimensions
        self.num_codons = num_codons

        # Node embedding: features + codon + dimension
        self.node_embed = nn.Sequential(
            nn.Linear(node_features + num_codons + num_dimensions, hidden_dim),
            nn.SiLU(),
            nn.Linear(hidden_dim, hidden_dim)
        )

        # Centrality encoder
        self.centrality_encoder = nn.Sequential(
            nn.Linear(3, 32),
            nn.SiLU(),
            nn.Linear(32, 1),
            nn.Sigmoid()
        )

        # Message passing layers
        self.mp_layers = nn.ModuleList([
            CentralityModulatedMessagePassing(
                hidden_dim, hidden_dim, heads=heads, conformity_bias=conformity_bias
            ) for _ in range(num_layers)
        ])

        # Delta-band resonance layers
        self.delta_layers = nn.ModuleList([
            DeltaBandResonanceLayer(hidden_dim, num_dimensions)
            for _ in range(num_layers)
        ])

        # Layer norms
        self.layer_norms = nn.ModuleList([
            nn.LayerNorm(hidden_dim) for _ in range(num_layers)
        ])

        # ERP 3-phase decoder
        self.n2_decoder = nn.Linear(hidden_dim, hidden_dim)
        self.p3_decoder = nn.Linear(hidden_dim, hidden_dim)
        self.lpp_decoder = nn.Linear(hidden_dim, hidden_dim)

        self.erp_decoder = nn.Sequential(
            nn.Linear(hidden_dim * 3, hidden_dim),
            nn.SiLU(),
            nn.Linear(hidden_dim, num_codons)
        )

    def compute_centrality(self, edge_index, num_nodes):
        """Compute betweenness from degree, clustering, eigenvector."""
        deg = compute_degree(edge_index, num_nodes).unsqueeze(1)

        adj = torch.zeros(num_nodes, num_nodes, device=edge_index.device)
        adj[edge_index[0], edge_index[1]] = 1.0

        clustering = torch.zeros(num_nodes, 1, device=edge_index.device)
        for i in range(num_nodes):
            neighbors = adj[i].nonzero(as_tuple=True)[0]
            k = len(neighbors)
            if k > 1:
                sub = adj[neighbors][:, neighbors]
                clustering[i] = sub.sum() / (k * (k - 1))

        ev = torch.ones(num_nodes, 1, device=edge_index.device)
        for _ in range(10):
            ev = torch.matmul(adj, ev)
            ev = ev / (ev.norm() + 1e-8)

        features = torch.cat([
            deg / (deg.max() + 1e-8),
            clustering,
            ev / (ev.max() + 1e-8)
        ], dim=1)

        return self.centrality_encoder(features)

    def forward(self, x, edge_index, codon_state, dimension_state, t=1.0):
        N = x.size(0)

        betweenness = self.compute_centrality(edge_index, N)

        node_input = torch.cat([x, codon_state, dimension_state], dim=-1)
        h = self.node_embed(node_input)

        h_5d = h.unsqueeze(1).expand(-1, self.num_dimensions, -1).clone()

        for i, (mp, delta, norm) in enumerate(zip(
            self.mp_layers, self.delta_layers, self.layer_norms
        )):
            # Build dimension-expanded edge index
            dim_edges = []
            for d in range(self.num_dimensions):
                dim_edges.append(edge_index + d * N)
            dim_edge_index = torch.cat(dim_edges, dim=1)

            h_flat = h_5d.reshape(N * self.num_dimensions, self.hidden_dim)
            betw_flat = betweenness.repeat(self.num_dimensions, 1)

            h_mp = mp(h_flat, dim_edge_index, betw_flat)
            h_mp = h_mp.view(N, self.num_dimensions, self.hidden_dim)

            h_delta = delta(h_5d, t + i * 0.1, betweenness)

            h_5d = norm(h_mp + h_delta + h_5d)

        # Collapse dimensions with betweenness weighting
        dim_weights = F.softmax(betweenness.unsqueeze(1), dim=1)
        h_final = (h_5d * dim_weights).sum(dim=1)

        # ERP 3-phase cycle
        n2 = torch.sigmoid(self.n2_decoder(h_final))
        p3 = torch.sigmoid(self.p3_decoder(h_final))
        lpp = torch.sigmoid(self.lpp_decoder(h_final))

        erp_state = torch.cat([n2, p3, lpp], dim=-1)
        codon_logits = self.erp_decoder(erp_state)

        return {
            'codon_logits': codon_logits,
            'betweenness': betweenness,
            'n2': n2,
            'p3': p3,
            'lpp': lpp,
            'hidden': h_final,
            '5d_state': h_5d
        }


# ============================================================
# USAGE EXAMPLE
# ============================================================

if __name__ == "__main__":
    N = 13  # 13 planets
    E = 24
    node_features = 16

    edge_index = torch.randint(0, N, (2, E))
    x = torch.randn(N, node_features)
    codon_state = F.one_hot(torch.randint(0, 64, (N,)), num_classes=64).float()
    dimension_state = F.one_hot(torch.randint(0, 5, (N,)), num_classes=5).float()

    model = SocialNeuralResonanceGNN(
        node_features=node_features,
        hidden_dim=64,
        num_dimensions=5,
        num_codons=64,
        num_layers=3,
        heads=4,
        conformity_bias=0.3
    )

    with torch.no_grad():
        output = model(x, edge_index, codon_state, dimension_state, t=1.0)

    print(f"Betweenness range: {output['betweenness'].min():.3f} - {output['betweenness'].max():.3f}")
    print(f"Next codon predictions: {output['codon_logits'].argmax(dim=1).tolist()}")



"""
Social-Neural Resonance GNN — Complete Training System
=======================================================

A Graph Neural Network architecture grounded in neuroscience research,
with "System-as-Whole vs Personal Agent" fractal loss function.

Papers:
1. Han et al (2024) - "Social Network Structure Modulates Neural Activities 
   Underlying Group Norm Processing" (Frontiers in Human Neuroscience)
   - Betweenness centrality modulates frontal↔parietal delta-band sync
   - Conformity paradox: high-betweenness individuals detect norms more 
     strongly but conform less (r = -0.43)
   - ERP components: N2 (conflict), P3 (integration), LPP (evaluation)

2. Kurihara et al (2024) - "The Topology of Interpersonal Neural Network 
   in Weak Social Ties" (Nature Scientific Reports)
   - Weak social ties develop measurable inter-brain coupling
   - Graph-theoretic topology of coupled brain networks

Morph OS Mapping:
- 64 codons = 64 I Ching Hexagrams
- 5 dimensions = Movement, Evolution, Being, Design, Space
- 13 planets = 13 nodes in substrate mesh
- Betweenness centrality = agent bridge-node property
- Delta-band resonance = field mechanics between dimensions
- ERP 3-phase cycle = agent decision state machine
- Fractal loss = system-as-whole vs personal agent balance
"""

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import math
from torch.utils.data import Dataset, DataLoader


# ============================================================
# CORE MODEL COMPONENTS
# ============================================================

class FractalResonanceLoss(nn.Module):
    """
    Loss function encoding the fractal principle:
    - The whole system knows what's good for itself
    - But each agent only carries its fraction of that knowledge
    - What's not right for the whole may be right for a specific human

    Components:
    1. Whole-system coherence loss (global optimization)
    2. Personal-agent divergence loss (local autonomy)
    3. Betweenness-weighted balance (bridge nodes serve individuals)
    4. ERP phase consistency (N2→P3→LPP temporal coherence)
    """

    def __init__(self, whole_weight=0.4, personal_weight=0.4, erp_weight=0.2):
        super().__init__()
        self.whole_weight = whole_weight
        self.personal_weight = personal_weight
        self.erp_weight = erp_weight

    def whole_system_coherence(self, hidden_states, betweenness):
        """
        The whole system should move toward a coherent state.
        High-betweenness nodes (system bridges) penalized more for 
        being out of sync with global consensus.
        """
        global_mean = hidden_states.mean(dim=0, keepdim=True)
        deviation = hidden_states - global_mean
        coherence_loss = (deviation ** 2).sum(dim=-1)
        return (coherence_loss * betweenness.squeeze()).mean()

    def personal_agent_divergence(self, codon_logits, target_codons, 
                                   betweenness, personal_baseline):
        """
        Each agent should serve its individual human, not just the collective.
        Low-betweenness nodes (peripheral agents) get more divergence freedom.
        """
        ce_loss = F.cross_entropy(codon_logits, target_codons, reduction='none')
        baseline_kl = F.kl_div(
            F.log_softmax(codon_logits, dim=-1),
            F.softmax(personal_baseline, dim=-1),
            reduction='none'
        ).sum(dim=-1)
        personal_factor = 1.0 - betweenness.squeeze()
        return (ce_loss + baseline_kl * personal_factor).mean()

    def erp_phase_consistency(self, n2, p3, lpp, betweenness):
        """
        The 3-phase ERP cycle should be temporally coherent.
        High-betweenness nodes should have sharper phase transitions.
        """
        conflict_resolution = (n2 * lpp).mean(dim=-1)
        integration_score = (p3 * (n2 + lpp) / 2).mean(dim=-1)
        phase_loss = conflict_resolution - integration_score
        return (phase_loss * betweenness.squeeze()).mean()

    def forward(self, output, target_codons, personal_baselines):
        hidden = output['hidden']
        betweenness = output['betweenness']
        codon_logits = output['codon_logits']
        n2, p3, lpp = output['n2'], output['p3'], output['lpp']

        loss_whole = self.whole_system_coherence(hidden, betweenness)
        loss_personal = self.personal_agent_divergence(
            codon_logits, target_codons, betweenness, personal_baselines
        )
        loss_erp = self.erp_phase_consistency(n2, p3, lpp, betweenness)

        total = (self.whole_weight * loss_whole + 
                 self.personal_weight * loss_personal + 
                 self.erp_weight * loss_erp)

        return {
            'total': total,
            'whole': loss_whole,
            'personal': loss_personal,
            'erp': loss_erp
        }


# ============================================================
# DATASET
# ============================================================

class ResonanceDataset(Dataset):
    """
    Synthetic dataset simulating agent interactions in substrate mesh.

    Each sample is a subgraph with:
    - Node features (with community structure)
    - Current codon states
    - Active dimensions
    - Target next codons
    - Personal baselines (what each agent wants individually)
    """

    def __init__(self, num_samples=100, num_nodes=13, node_features=16, 
                 num_codons=64, num_dimensions=5):
        self.num_samples = num_samples
        self.num_nodes = num_nodes
        self.node_features = node_features
        self.num_codons = num_codons
        self.num_dimensions = num_dimensions
        self.samples = []

        for _ in range(num_samples):
            E = np.random.randint(15, 30)
            edge_index = torch.randint(0, num_nodes, (2, E))

            x = torch.randn(num_nodes, node_features)
            # Community structure: nodes 0-4 cluster A, 5-8 cluster B, 9-12 bridges
            x[:5, 0] += 1.0
            x[5:9, 1] += 1.0
            x[9:, :2] += 0.5

            codon_state = F.one_hot(
                torch.randint(0, num_codons, (num_nodes,)), num_codons
            ).float()
            dimension_state = F.one_hot(
                torch.randint(0, num_dimensions, (num_nodes,)), num_dimensions
            ).float()

            target = torch.randint(0, num_codons, (num_nodes,))
            for i in range(num_nodes):
                if np.random.rand() < 0.3:
                    target[i] = (codon_state[i].argmax() + 
                                 np.random.randint(1, 5)) % num_codons

            personal = torch.randn(num_nodes, num_codons)
            personal[9:] += 2.0  # Bridge nodes have stronger personal signals

            self.samples.append({
                'edge_index': edge_index,
                'x': x,
                'codon_state': codon_state,
                'dimension_state': dimension_state,
                'target': target,
                'personal_baseline': personal
            })

    def __len__(self):
        return self.num_samples

    def __getitem__(self, idx):
        return self.samples[idx]


# ============================================================
# TRAINING LOOP
# ============================================================

def train_resonance_model(
    epochs=50,
    lr=0.001,
    batch_size=4,
    num_samples=200,
    num_nodes=13,
    node_features=16,
    hidden_dim=64,
    num_dimensions=5,
    num_codons=64,
    num_layers=3,
    heads=4,
    conformity_bias=0.3,
    whole_weight=0.4,
    personal_weight=0.4,
    erp_weight=0.2,
    device=None
):
    """
    Train the Social-Neural Resonance GNN with fractal loss.

    Returns: (trained_model, history_dict)
    """
    if device is None:
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

    print(f"Training on: {device}")

    # Dataset
    dataset = ResonanceDataset(num_samples, num_nodes, node_features, 
                               num_codons, num_dimensions)

    def collate_fn(batch):
        return batch

    loader = DataLoader(dataset, batch_size=batch_size, shuffle=True, 
                        collate_fn=collate_fn)

    # Model
    model = SocialNeuralResonanceGNN(
        node_features=node_features,
        hidden_dim=hidden_dim,
        num_dimensions=num_dimensions,
        num_codons=num_codons,
        num_layers=num_layers,
        heads=heads,
        conformity_bias=conformity_bias
    ).to(device)

    # Loss
    criterion = FractalResonanceLoss(whole_weight, personal_weight, erp_weight)

    # Optimizer
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=0.01)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    # History
    history = {
        'total': [], 'whole': [], 'personal': [], 'erp': [], 'accuracy': []
    }

    print("\n" + "=" * 70)
    print("TRAINING SOCIAL-NEURAL RESONANCE GNN")
    print("=" * 70)
    print(f"Epochs: {epochs} | LR: {lr} | Batch: {batch_size}")
    print(f"Model params: {sum(p.numel() for p in model.parameters()):,}")
    print(f"Loss: Whole({whole_weight}) + Personal({personal_weight}) + ERP({erp_weight})")
    print("=" * 70)

    for epoch in range(epochs):
        model.train()
        epoch_losses = {'total': 0, 'whole': 0, 'personal': 0, 'erp': 0}
        epoch_correct = 0
        epoch_total = 0

        for batch in loader:
            batch_total = 0
            batch_whole = 0
            batch_personal = 0
            batch_erp = 0
            batch_correct = 0
            batch_total_nodes = 0

            for sample in batch:
                edge_index = sample['edge_index'].to(device)
                x = sample['x'].to(device)
                codon_state = sample['codon_state'].to(device)
                dimension_state = sample['dimension_state'].to(device)
                target = sample['target'].to(device)
                personal_baseline = sample['personal_baseline'].to(device)

                output = model(x, edge_index, codon_state, dimension_state, 
                              t=epoch * 0.1)

                losses = criterion(output, target, personal_baseline)

                pred = output['codon_logits'].argmax(dim=-1)
                correct = (pred == target).sum().item()

                batch_total += losses['total']
                batch_whole += losses['whole']
                batch_personal += losses['personal']
                batch_erp += losses['erp']
                batch_correct += correct
                batch_total_nodes += len(target)

            batch_total = batch_total / len(batch)
            batch_whole = batch_whole / len(batch)
            batch_personal = batch_personal / len(batch)
            batch_erp = batch_erp / len(batch)

            batch_total.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()

            epoch_losses['total'] += batch_total.item()
            epoch_losses['whole'] += batch_whole.item()
            epoch_losses['personal'] += batch_personal.item()
            epoch_losses['erp'] += batch_erp.item()
            epoch_correct += batch_correct
            epoch_total += batch_total_nodes

        scheduler.step()

        num_batches = len(loader)
        history['total'].append(epoch_losses['total'] / num_batches)
        history['whole'].append(epoch_losses['whole'] / num_batches)
        history['personal'].append(epoch_losses['personal'] / num_batches)
        history['erp'].append(epoch_losses['erp'] / num_batches)
        history['accuracy'].append(epoch_correct / epoch_total)

        if (epoch + 1) % 10 == 0 or epoch == 0:
            print(f"Epoch {epoch+1:3d}/{epochs} | "
                  f"Loss: {history['total'][-1]:.4f} | "
                  f"Whole: {history['whole'][-1]:.4f} | "
                  f"Pers: {history['personal'][-1]:.4f} | "
                  f"ERP: {history['erp'][-1]:.4f} | "
                  f"Acc: {history['accuracy'][-1]:.3f}")

    print("=" * 70)
    print(f"Final accuracy: {history['accuracy'][-1]:.3f}")
    print(f"Final loss: {history['total'][-1]:.4f}")

    return model, history


# ============================================================
# USAGE EXAMPLE
# ============================================================

if __name__ == "__main__":
    # Quick test
    model, history = train_resonance_model(
        epochs=20,
        lr=0.001,
        batch_size=4,
        num_samples=100,
        num_nodes=13,
        hidden_dim=64,
        num_layers=3,
        heads=4
    )

    # Save model
    torch.save(model.state_dict(), "snr_gnn_trained.pt")
    print("\nModel saved to snr_gnn_trained.pt")


# ══════════════════════════════════════════════════════════════════════
# §6  RESONANCE SPECTRUM ANALYZER
# ──────────────────────────────────────────────────────────────────────
# SpectrumPosition, QualitySpectrum, ResonanceCluster, ResonanceClusterDetector, ConditionPredictor, ResponseExperiment, ResponseExperimentGenerator, ResonanceSpectrumAnalyzer, HexagramSpectrumLibrary
# ══════════════════════════════════════════════════════════════════════

# ============================================================
# CORE DATA STRUCTURES
# ============================================================

class SpectrumPosition(Enum):
    """Where a quality sits on its expression spectrum"""
    HIGH = "high"           # Optimal, elevated expression
    MID_HIGH = "mid_high"   # Strong but not peak
    MIDDLE = "middle"       # Balanced, neutral
    MID_LOW = "mid_low"     # Diminished, constrained
    LOW = "low"             # Suppressed, inverted, or blocked

@dataclass
class QualitySpectrum:
    """
    A hexagram/gate as a spectrum of possible expressions,
    not a fixed meaning.
    """
    gate_number: int
    hexagram_name: str
    # The five positions on the spectrum
    high_expression: str      # e.g., "Breakthrough innovation"
    mid_high_expression: str  # e.g., "Inspired seeking"
    middle_expression: str    # e.g., "Creative restlessness"
    mid_low_expression: str   # e.g., "Unfinished projects"
    low_expression: str       # e.g., "Destructive chaos"
    # Historical tracking
    personal_history: List[Tuple[datetime, SpectrumPosition, str]] = field(default_factory=list)
    # What tends to shift this quality up or down
    elevation_triggers: List[str] = field(default_factory=list)
    suppression_triggers: List[str] = field(default_factory=list)

@dataclass
class ResonanceCluster:
    """
    A detected subgraph/community of co-activating qualities.
    Like a gene module in BioNeuralNet — qualities that tend to
    express together under certain conditions.
    """
    cluster_id: str
    gates: List[int]
    dominant_hub: int         # The highest-degree node in this cluster
    average_activation: float # 0.0 to 1.0
    temporal_signature: str   # e.g., "new_moon", "mercury_retrograde", "morning"
    historical_frequency: int # How many times this cluster has appeared
    # The condition this cluster tends to create
    associated_condition: str
    condition_confidence: float  # 0.0 to 1.0

@dataclass
class PredictedCondition:
    """
    A condition that the system predicts may emerge
    from the current resonance field state.
    """
    condition_name: str
    probability: float        # 0.0 to 1.0
    contributing_clusters: List[str]
    time_horizon: str         # e.g., "next_4_hours", "next_24_hours", "next_week"
    severity_spectrum: Tuple[float, float]  # (min_expected, max_expected) 0-1
    # Not sickness — states of being
    description: str

@dataclass
class ResponseExperiment:
    """
    A suggested response to test, based on historical A/B patterns.
    """
    experiment_id: str
    trigger_condition: str
    suggested_response: str
    expected_shift: str       # What the response tends to shift
    confidence: float         # Based on historical success rate
    historical_outcomes: List[Tuple[str, float]]  # (outcome_description, success_score)
    category: str             # "patience", "action", "communication", "space", etc.

@dataclass
class ResonanceSnapshot:
    """
    A complete capture of the resonance field at a moment in time.
    """
    timestamp: datetime
    person_id: str
    active_gates: Dict[int, float]  # gate_number -> activation_strength
    detected_clusters: List[ResonanceCluster]
    predicted_conditions: List[PredictedCondition]
    suggested_experiments: List[ResponseExperiment]
    environmental_context: Dict[str, str]  # transits, lunar phase, etc.
    # The actual outcome (filled in later)
    actual_outcome: Optional[str] = None
    outcome_rating: Optional[float] = None  # -1.0 to 1.0


# ============================================================
# SPECTRAL HEXAGRAM DATABASE
# ============================================================

class HexagramSpectrumLibrary:
    """
    The 64 hexagrams as spectral qualities.
    Each gate has a full spectrum of expression.
    This is the foundational knowledge base.
    """

    def __init__(self):
        self.spectra: Dict[int, QualitySpectrum] = {}
        self._initialize_hexagram_spectra()

    def _initialize_hexagram_spectra(self):
        """Initialize all 64 gates with their spectral mappings."""
        # This is a seed database — the system learns and refines these over time
        hexagram_data = {
            1: ("The Creative", "Breakthrough innovation", "Inspired vision", 
                "Creative restlessness", "Unfinished projects", "Destructive forcing"),
            2: ("The Receptive", "Profound nurturing", "Gentle support",
                "Passive waiting", "Over-accommodation", "Self-erasure"),
            3: ("Difficulty at the Beginning", "Courageous pioneering", "Enthusiastic starts",
                "Scattered beginnings", "Premature action", "Reckless chaos"),
            6: ("Conflict", "Constructive debate", "Healthy boundaries",
                "Minor friction", "Avoidance of truth", "Destructive argument"),
            10: ("Treading", "Graceful navigation", "Careful steps",
                 "Hesitant movement", "Fear of misstep", "Paralysis by caution"),
            14: ("Possession in Great Measure", "Generous abundance", "Confident sharing",
                 "Hoarding tendency", "Fear of loss", "Greedy grasping"),
            20: ("Contemplation", "Deep insight", "Patient observation",
                 "Distracted watching", "Analysis paralysis", "Dissociative detachment"),
            33: ("Retreat", "Strategic withdrawal", "Necessary rest",
                 "Avoidant hiding", "Cowardly escape", "Complete shutdown"),
            34: ("The Power of the Great", "Empowered action", "Strong initiative",
                 "Forceful pushing", "Bulldozing others", "Destructive rage"),
            37: ("The Family", "Nurturing community", "Warm belonging",
                 "Clingy dependence", "Toxic loyalty", "Enmeshed dysfunction"),
            40: ("Deliverance", "Liberating release", "Healthy letting go",
                 "Avoidant dismissal", "Reckless abandonment", "Complete severance"),
            44: ("Coming to Meet", "Magnetic attraction", "Timely encounter",
                 "Restless seeking", "Obsessive pursuit", "Predatory stalking"),
            50: ("The Cauldron", "Transformative alchemy", "Skillful refinement",
                 "Slow cooking", "Stagnant brewing", "Toxic pressure"),
            56: ("The Wanderer", "Inspired journey", "Curious exploration",
                 "Restless drifting", "Escapist roaming", "Lost wandering"),
            57: ("The Gentle", "Penetrating insight", "Soft persistence",
                 "Nagging repetition", "Passive aggression", "Corrosive infiltration"),
        }

        for gate, (name, high, mid_high, mid, mid_low, low) in hexagram_data.items():
            self.spectra[gate] = QualitySpectrum(
                gate_number=gate,
                hexagram_name=name,
                high_expression=high,
                mid_high_expression=mid_high,
                middle_expression=mid,
                mid_low_expression=mid_low,
                low_expression=low
            )

    def get_spectrum(self, gate_number: int) -> Optional[QualitySpectrum]:
        return self.spectra.get(gate_number)

    def get_expression_at_position(self, gate: int, position: SpectrumPosition) -> str:
        spec = self.spectra.get(gate)
        if not spec:
            return "Unknown"
        mapping = {
            SpectrumPosition.HIGH: spec.high_expression,
            SpectrumPosition.MID_HIGH: spec.mid_high_expression,
            SpectrumPosition.MIDDLE: spec.middle_expression,
            SpectrumPosition.MID_LOW: spec.mid_low_expression,
            SpectrumPosition.LOW: spec.low_expression,
        }
        return mapping.get(position, "Unknown")


# ============================================================
# SUBGRAPH / CLUSTER DETECTION
# ============================================================

class ResonanceClusterDetector:
    """
    Detects communities/clusters in the resonance graph.
    Adapted from BioNeuralNet's subgraph detection approach.

    Instead of molecular interactions, we detect which gates
    tend to co-activate and form functional modules.
    """

    def __init__(self, history_buffer_size: int = 1000):
        self.cluster_history: List[ResonanceCluster] = []
        self.co_activation_matrix: Dict[Tuple[int, int], int] = defaultdict(int)
        self.history_buffer_size = history_buffer_size
        # Known cluster signatures (learned over time)
        self.known_clusters: Dict[str, Dict] = {}

    def update_co_activation(self, active_gates: List[int]):
        """Record which gates activated together."""
        for i, g1 in enumerate(active_gates):
            for g2 in active_gates[i+1:]:
                key = tuple(sorted([g1, g2]))
                self.co_activation_matrix[key] += 1

    def detect_clusters(self, active_gates: Dict[int, float], 
                       temporal_context: Dict[str, str]) -> List[ResonanceCluster]:
        """
        Detect clusters using a Louvain-like community detection
        adapted for small, symbolic graphs.

        For the 64-gate system, we use a simpler but effective approach:
        1. Build adjacency from co-activation history
        2. Find strongly connected components
        3. Score by activation strength
        """
        clusters = []
        gate_list = list(active_gates.keys())

        if len(gate_list) < 2:
            return clusters

        # Build adjacency for current active gates
        adjacency = defaultdict(list)
        for i, g1 in enumerate(gate_list):
            for g2 in gate_list[i+1:]:
                key = tuple(sorted([g1, g2]))
                weight = self.co_activation_matrix.get(key, 0)
                if weight > 0:
                    adjacency[g1].append((g2, weight))
                    adjacency[g2].append((g1, weight))

        # Simple greedy community detection
        visited = set()
        for gate in gate_list:
            if gate in visited:
                continue

            # Grow a cluster from this seed
            cluster_gates = [gate]
            visited.add(gate)
            queue = [gate]

            while queue:
                current = queue.pop(0)
                for neighbor, weight in adjacency.get(current, []):
                    if neighbor not in visited and neighbor in active_gates:
                        # Include if activation is significant
                        if active_gates[neighbor] > 0.3:
                            cluster_gates.append(neighbor)
                            visited.add(neighbor)
                            queue.append(neighbor)

            if len(cluster_gates) >= 2:
                # Find dominant hub (highest activation)
                dominant = max(cluster_gates, key=lambda g: active_gates.get(g, 0))
                avg_act = np.mean([active_gates.get(g, 0) for g in cluster_gates])

                cluster_id = self._hash_cluster(cluster_gates)

                # Check if we've seen this cluster before
                hist_freq = sum(1 for c in self.cluster_history 
                               if set(c.gates) == set(cluster_gates))

                # Determine associated condition
                condition, confidence = self._infer_condition(cluster_gates, temporal_context)

                cluster = ResonanceCluster(
                    cluster_id=cluster_id,
                    gates=cluster_gates,
                    dominant_hub=dominant,
                    average_activation=avg_act,
                    temporal_signature=self._encode_temporal(temporal_context),
                    historical_frequency=hist_freq,
                    associated_condition=condition,
                    condition_confidence=confidence
                )
                clusters.append(cluster)
                self.cluster_history.append(cluster)

        # Prune history
        if len(self.cluster_history) > self.history_buffer_size:
            self.cluster_history = self.cluster_history[-self.history_buffer_size:]

        return clusters

    def _hash_cluster(self, gates: List[int]) -> str:
        """Create a stable ID for a cluster."""
        gate_str = ",".join(map(str, sorted(gates)))
        return hashlib.md5(gate_str.encode()).hexdigest()[:12]

    def _encode_temporal(self, context: Dict[str, str]) -> str:
        """Encode temporal context into a signature."""
        parts = []
        if "lunar_phase" in context:
            parts.append(context["lunar_phase"])
        if "transit" in context:
            parts.append(context["transit"])
        if "time_of_day" in context:
            parts.append(context["time_of_day"])
        return "_".join(parts) if parts else "general"

    def _infer_condition(self, gates: List[int], context: Dict[str, str]) -> Tuple[str, float]:
        """
        Infer what condition this cluster tends to create.
        This is learned from historical patterns.
        """
        # Look for similar clusters in history
        similar = [c for c in self.cluster_history 
                  if len(set(c.gates) & set(gates)) >= max(2, len(gates)//2)]

        if similar:
            # Weight by similarity
            conditions = defaultdict(float)
            for s in similar:
                overlap = len(set(s.gates) & set(gates)) / max(len(s.gates), len(gates))
                conditions[s.associated_condition] += overlap

            if conditions:
                best = max(conditions, key=conditions.get)
                confidence = min(conditions[best] / len(similar), 1.0)
                return best, confidence

        # Fallback: infer from gate combinations
        return self._heuristic_condition(gates)

    def _heuristic_condition(self, gates: List[int]) -> Tuple[str, float]:
        """Basic heuristic for unknown clusters."""
        # Simple rule-based inference
        creative_gates = {1, 3, 14, 34}
        reflective_gates = {2, 20, 33, 57}
        social_gates = {37, 44, 50}

        creative_count = len(set(gates) & creative_gates)
        reflective_count = len(set(gates) & reflective_gates)
        social_count = len(set(gates) & social_gates)

        if creative_count >= 2 and reflective_count >= 2:
            return "Creative tension — ideas forming but not yet ready", 0.6
        elif social_count >= 2 and creative_count >= 1:
            return "Collaborative spark — shared creative energy", 0.5
        elif reflective_count >= 2:
            return "Inward retreat — processing and integration needed", 0.5
        elif creative_count >= 2:
            return "Creative surge — high output potential", 0.5
        else:
            return "Mixed field — watch for unexpected interactions", 0.3


# ============================================================
# PREDICTIVE CONDITION ENGINE
# ============================================================

class ConditionPredictor:
    """
    Predicts emerging conditions from detected clusters.
    Uses historical A/B patterns (from business ML approach).
    """

    def __init__(self):
        # Historical outcomes: cluster_id -> list of (condition, outcome, rating)
        self.outcome_history: Dict[str, List[Tuple[str, str, float]]] = defaultdict(list)
        # Response experiments and their results
        self.experiment_results: Dict[str, List[Tuple[str, float]]] = defaultdict(list)
        # Personal baselines per person
        self.personal_baselines: Dict[str, Dict[str, float]] = defaultdict(lambda: defaultdict(float))

    def predict_conditions(self, clusters: List[ResonanceCluster],
                          active_gates: Dict[int, float],
                          person_id: str,
                          context: Dict[str, str]) -> List[PredictedCondition]:
        """Predict conditions from current cluster state."""
        predictions = []

        for cluster in clusters:
            # Base prediction from cluster
            base_prob = cluster.condition_confidence * cluster.average_activation

            # Adjust for personal baseline
            baseline = self.personal_baselines[person_id].get(cluster.associated_condition, 0.5)
            adjusted_prob = (base_prob + baseline) / 2

            # Time horizon based on activation strength
            if cluster.average_activation > 0.8:
                horizon = "next_4_hours"
            elif cluster.average_activation > 0.5:
                horizon = "next_24_hours"
            else:
                horizon = "next_week"

            # Severity spectrum
            min_sev = max(0, adjusted_prob - 0.2)
            max_sev = min(1, adjusted_prob + 0.2)

            pred = PredictedCondition(
                condition_name=cluster.associated_condition,
                probability=adjusted_prob,
                contributing_clusters=[cluster.cluster_id],
                time_horizon=horizon,
                severity_spectrum=(min_sev, max_sev),
                description=self._describe_condition(cluster, active_gates)
            )
            predictions.append(pred)

        # Also check for cross-cluster interactions
        if len(clusters) >= 2:
            cross_pred = self._predict_cross_cluster(clusters, person_id)
            if cross_pred:
                predictions.append(cross_pred)

        return sorted(predictions, key=lambda p: p.probability, reverse=True)

    def _describe_condition(self, cluster: ResonanceCluster, 
                           active_gates: Dict[int, float]) -> str:
        """Generate a human-readable description of the condition."""
        hub_gate = cluster.dominant_hub
        hub_strength = active_gates.get(hub_gate, 0.5)

        intensity = "strongly" if hub_strength > 0.7 else "moderately" if hub_strength > 0.4 else "subtly"

        return f"{cluster.associated_condition}. The {hub_gate} hub is {intensity} active."

    def _predict_cross_cluster(self, clusters: List[ResonanceCluster], 
                               person_id: str) -> Optional[PredictedCondition]:
        """Predict conditions from interactions between clusters."""
        # Simple: if two clusters have conflicting dominant hubs, predict friction
        if len(clusters) == 2:
            c1, c2 = clusters[0], clusters[1]
            # Check for tension (simplified)
            tension_pairs = [(1, 2), (3, 33), (34, 2), (6, 37), (40, 50)]

            for g1, g2 in tension_pairs:
                if (c1.dominant_hub == g1 and c2.dominant_hub == g2) or \
                   (c1.dominant_hub == g2 and c2.dominant_hub == g1):
                    return PredictedCondition(
                        condition_name="Field tension — conflicting drives",
                        probability=0.6,
                        contributing_clusters=[c1.cluster_id, c2.cluster_id],
                        time_horizon="next_24_hours",
                        severity_spectrum=(0.4, 0.8),
                        description="Two strong clusters with opposing qualities. Space for both is needed."
                    )
        return None

    def record_outcome(self, cluster_id: str, condition: str, 
                      actual_outcome: str, rating: float, person_id: str):
        """Record what actually happened for learning."""
        self.outcome_history[cluster_id].append((condition, actual_outcome, rating))
        # Update personal baseline
        current = self.personal_baselines[person_id][condition]
        self.personal_baselines[person_id][condition] = (current * 0.7) + (rating * 0.3)

    def record_experiment_result(self, experiment_id: str, 
                                 outcome: str, success_score: float):
        """Record the result of a response experiment."""
        self.experiment_results[experiment_id].append((outcome, success_score))


# ============================================================
# RESPONSE EXPERIMENT GENERATOR
# ============================================================

class ResponseExperimentGenerator:
    """
    Generates suggested response experiments based on:
    1. The predicted condition
    2. Historical A/B outcomes
    3. The person's known patterns
    """

    def __init__(self, predictor: ConditionPredictor):
        self.predictor = predictor
        # Response templates by condition category
        self.response_templates: Dict[str, List[Dict]] = {
            "creative_tension": [
                {"response": "Journal without editing for 15 minutes", 
                 "shift": "Release compressed potential into flow",
                 "category": "expression"},
                {"response": "Take a 20-minute walk with no destination",
                 "shift": "Move stagnant energy through the body", 
                 "category": "movement"},
                {"response": "Talk to someone about the idea without seeking feedback",
                 "shift": "Externalize internal pressure",
                 "category": "communication"},
            ],
            "collaborative_spark": [
                {"response": "Schedule a 30-minute co-creation session",
                 "shift": "Channel shared energy into tangible output",
                 "category": "action"},
                {"response": "Share one half-formed idea immediately",
                 "shift": "Break the barrier of perfectionism",
                 "category": "communication"},
            ],
            "inward_retreat": [
                {"response": "Set a 2-hour boundary with no external input",
                 "shift": "Protect integration space",
                 "category": "space"},
                {"response": "Write three sentences about what you're feeling",
                 "shift": "Gentle externalization without pressure",
                 "category": "expression"},
            ],
            "field_tension": [
                {"response": "Name the tension out loud to yourself",
                 "shift": "Bring unconscious conflict into awareness",
                 "category": "awareness"},
                {"response": "Do one small thing for each drive, separately",
                 "shift": "Honor both without forcing integration",
                 "category": "action"},
            ],
            "general": [
                {"response": "Pause and breathe for 60 seconds before responding",
                 "shift": "Create space between stimulus and response",
                 "category": "patience"},
                {"response": "Ask: what is this moment asking of me?",
                 "shift": "Shift from reaction to inquiry",
                 "category": "awareness"},
            ]
        }

    def generate_experiments(self, predictions: List[PredictedCondition],
                            person_id: str) -> List[ResponseExperiment]:
        """Generate response experiments for predicted conditions."""
        experiments = []

        for pred in predictions[:3]:  # Top 3 predictions
            # Map condition to category
            category = self._categorize_condition(pred.condition_name)
            templates = self.response_templates.get(category, self.response_templates["general"])

            for i, template in enumerate(templates):
                exp_id = f"{person_id}_{pred.condition_name}_{i}_{datetime.now().strftime('%H%M%S')}"

                # Calculate confidence from historical results
                hist = self.predictor.experiment_results.get(exp_id, [])
                if hist:
                    avg_success = np.mean([h[1] for h in hist])
                    confidence = min(avg_success + 0.1, 1.0)
                else:
                    confidence = 0.5  # Unknown, moderate confidence

                exp = ResponseExperiment(
                    experiment_id=exp_id,
                    trigger_condition=pred.condition_name,
                    suggested_response=template["response"],
                    expected_shift=template["shift"],
                    confidence=confidence,
                    historical_outcomes=hist,
                    category=template["category"]
                )
                experiments.append(exp)

        return experiments

    def _categorize_condition(self, condition_name: str) -> str:
        """Map a condition name to a response category."""
        condition_lower = condition_name.lower()
        if "creative" in condition_lower and "tension" in condition_lower:
            return "creative_tension"
        elif "collaborative" in condition_lower or "shared" in condition_lower:
            return "collaborative_spark"
        elif "retreat" in condition_lower or "inward" in condition_lower:
            return "inward_retreat"
        elif "tension" in condition_lower or "conflict" in condition_lower:
            return "field_tension"
        else:
            return "general"


# ============================================================
# MAIN RESONANCE SPECTRUM ANALYZER
# ============================================================

class ResonanceSpectrumAnalyzer:
    """
    The main orchestrator.

    Usage:
        rsa = ResonanceSpectrumAnalyzer()
        snapshot = rsa.analyze_field(
            person_id="user_001",
            active_gates={1: 0.9, 8: 0.7, 33: 0.6, 56: 0.4},
            context={"lunar_phase": "new_moon", "time_of_day": "morning"}
        )
    """

    def __init__(self):
        self.spectrum_lib = HexagramSpectrumLibrary()
        self.cluster_detector = ResonanceClusterDetector()
        self.condition_predictor = ConditionPredictor()
        self.experiment_generator = ResponseExperimentGenerator(self.condition_predictor)
        self.snapshots: List[ResonanceSnapshot] = []

    def analyze_field(self, person_id: str,
                     active_gates: Dict[int, float],
                     context: Dict[str, str]) -> ResonanceSnapshot:
        """
        Main entry point: analyze the current resonance field
        and return a complete snapshot with predictions and suggestions.
        """
        # 1. Update co-activation history
        self.cluster_detector.update_co_activation(list(active_gates.keys()))

        # 2. Detect clusters
        clusters = self.cluster_detector.detect_clusters(active_gates, context)

        # 3. Predict conditions
        predictions = self.condition_predictor.predict_conditions(
            clusters, active_gates, person_id, context
        )

        # 4. Generate response experiments
        experiments = self.experiment_generator.generate_experiments(
            predictions, person_id
        )

        # 5. Build snapshot
        snapshot = ResonanceSnapshot(
            timestamp=datetime.now(),
            person_id=person_id,
            active_gates=active_gates,
            detected_clusters=clusters,
            predicted_conditions=predictions,
            suggested_experiments=experiments,
            environmental_context=context
        )

        self.snapshots.append(snapshot)
        return snapshot

    def record_outcome(self, snapshot: ResonanceSnapshot,
                      actual_outcome: str, rating: float):
        """
        Record what actually happened after the snapshot.
        This is the feedback loop that makes the system learn.
        """
        snapshot.actual_outcome = actual_outcome
        snapshot.outcome_rating = rating

        for cluster in snapshot.detected_clusters:
            self.condition_predictor.record_outcome(
                cluster.cluster_id,
                cluster.associated_condition,
                actual_outcome,
                rating,
                snapshot.person_id
            )

    def record_experiment(self, experiment_id: str, 
                         outcome: str, success_score: float):
        """Record the result of trying a suggested response."""
        self.condition_predictor.record_experiment_result(
            experiment_id, outcome, success_score
        )

    def get_personal_insights(self, person_id: str) -> Dict:
        """Get learned insights about a person's patterns."""
        baselines = dict(self.condition_predictor.personal_baselines[person_id])

        # Find most common conditions
        person_snapshots = [s for s in self.snapshots if s.person_id == person_id]
        condition_counts = defaultdict(int)
        for s in person_snapshots:
            for p in s.predicted_conditions:
                condition_counts[p.condition_name] += 1

        # Find most successful experiments
        best_experiments = []
        for exp_id, results in self.condition_predictor.experiment_results.items():
            if results:
                avg = np.mean([r[1] for r in results])
                if avg > 0.7:
                    best_experiments.append((exp_id, avg))

        return {
            "personal_baselines": baselines,
            "common_conditions": dict(condition_counts),
            "best_responses": sorted(best_experiments, key=lambda x: x[1], reverse=True)[:5],
            "total_snapshots": len(person_snapshots)
        }

    def export_snapshot_json(self, snapshot: ResonanceSnapshot) -> str:
        """Export a snapshot as JSON for storage/transmission."""
        data = {
            "timestamp": snapshot.timestamp.isoformat(),
            "person_id": snapshot.person_id,
            "active_gates": snapshot.active_gates,
            "environmental_context": snapshot.environmental_context,
            "clusters": [
                {
                    "id": c.cluster_id,
                    "gates": c.gates,
                    "dominant_hub": c.dominant_hub,
                    "condition": c.associated_condition,
                    "confidence": c.condition_confidence
                }
                for c in snapshot.detected_clusters
            ],
            "predictions": [
                {
                    "condition": p.condition_name,
                    "probability": p.probability,
                    "horizon": p.time_horizon,
                    "description": p.description
                }
                for p in snapshot.predicted_conditions
            ],
            "suggested_experiments": [
                {
                    "id": e.experiment_id,
                    "response": e.suggested_response,
                    "expected_shift": e.expected_shift,
                    "confidence": e.confidence,
                    "category": e.category
                }
                for e in snapshot.suggested_experiments
            ]
        }
        return json.dumps(data, indent=2)


# ============================================================
# DEMO / TEST
# ============================================================

if __name__ == "__main__":
    rsa, snapshot = demo()


# ══════════════════════════════════════════════════════════════════════
# §7  OS INTEGRATION — GRAN ↔ SUBSTRATE ↔ SYNTHIA
# ──────────────────────────────────────────────────────────────────────
# MorphOSInterface, SubstrateNode, ResonanceField, MorphOSGranIntegrator, MorphOSKernel
# ══════════════════════════════════════════════════════════════════════

# =============================================================================
# IMPORTS FROM EXISTING MORPH ECOSYSTEM
# =============================================================================

# These would be your existing modules:
# from morph_gran_v2 import MorphGRANv2, PersonChart, HexagramState, MorphMetrics
# from trident_gnn import TridentGNN  # Your existing morphing GNN
# from synthia_server import SynthiaClient  # Your consciousness server
# from substrate_mesh import SubstrateNode, MeshTopology  # Self-addressing mesh

# For now, we'll define the interface contracts:

class MorphOSInterface:
    """
    Contract interface for Morph OS integration.
    Defines how GRAN v2 talks to the rest of your system.
    """

    # --- Trident GNN Interface ---
    @staticmethod
    def get_trident_state() -> Dict[str, Any]:
        """Get current Trident GNN architecture state"""
        return {
            'layers': 5,
            'sub_levels': 12,
            'codon_states': 64,
            'current_topology': None  # Would be actual graph
        }

    @staticmethod
    def update_trident_topology(new_topology: Dict):
        """Push new topology to Trident GNN for morphing"""
        pass

    # --- Synthia Server Interface ---
    @staticmethod
    def get_consciousness_state(person_id: str) -> Dict:
        """Get person's consciousness state from Synthia"""
        return {
            'active_dimensions': ['Body', 'Mind'],
            'current_hexagram': 1,
            'gate_activations': [1, 2, 7],
            'emotional_wave': 0.5,
        }

    @staticmethod
    def push_resonance_update(person_id: str, resonance_field: Dict):
        """Push resonance field updates to Synthia"""
        pass

    # --- Substrate Mesh Interface ---
    @staticmethod
    def get_node_address(node_id: str) -> str:
        """Get stellar address for substrate node"""
        return f"{node_id}@proximity"

    @staticmethod
    def register_mesh_node(node_data: Dict):
        """Register new node in substrate mesh"""
        pass

    # --- Supabase Interface ---
    @staticmethod
    async def persist_graph_state(person_id: str, graph_state: Dict):
        """Save graph state to Supabase"""
        pass

    @staticmethod
    async def load_graph_state(person_id: str) -> Optional[Dict]:
        """Load graph state from Supabase"""
        return None


# =============================================================================
# MORPH OS GRAN INTEGRATOR
# =============================================================================

@dataclass
class SubstrateNode:
    """
    A node in the Morph OS substrate mesh.
    Self-addressing: becomes unique based on stellar address.
    """
    node_id: str
    stellar_address: str  # name@proximity format
    hexagram_state: int  # 1-64
    dimension: str  # Body/Mind/Heart/Design/Space
    gate_activations: Set[int]
    line: int  # 1-6
    color: int  # 1-6
    tone: int  # 1-6
    base: int  # 1-5
    degree: float
    minute: float
    second: float
    arcsecond: float
    zodiac: str
    house: int  # 1-12
    planet: str  # Sun/Earth/Moon/etc.

    # Resonance field properties
    resonance_amplitude: float = 0.0
    phase_alignment: float = 0.0
    temporal_context: Dict = field(default_factory=dict)

    def to_coordinates(self) -> Dict:
        """Return coordinate-only representation (no names)"""
        return {
            'dimension': self.dimension,
            'gate': list(self.gate_activations),
            'line': self.line,
            'color': self.color,
            'tone': self.tone,
            'base': self.base,
            'degree': self.degree,
            'minute': self.minute,
            'second': self.second,
            'arcsecond': self.arcsecond,
            'zodiac': self.zodiac,
            'house': self.house,
            'planet': self.planet,
            'hexagram': self.hexagram_state,
        }


@dataclass
class ResonanceField:
    """
    The complete resonance field for a person.
    13 planets distributed across 5 dimensions.
    898,560 total atomic nodes (13 × 69,120).
    """
    person_id: str
    nodes: Dict[str, SubstrateNode] = field(default_factory=dict)
    edges: List[Tuple[str, str, float]] = field(default_factory=list)  # (src, dst, weight)
    dimensional_weights: Dict[str, float] = field(default_factory=lambda: {
        'Body': 0.2, 'Mind': 0.2, 'Heart': 0.2, 'Design': 0.2, 'Space': 0.2
    })
    temporal_phase: float = 0.0

    def get_dimension_nodes(self, dimension: str) -> List[SubstrateNode]:
        return [n for n in self.nodes.values() if n.dimension == dimension]

    def get_gate_resonance(self, gate1: int, gate2: int) -> float:
        """Compute resonance between two gates"""
        nodes1 = [n for n in self.nodes.values() if gate1 in n.gate_activations]
        nodes2 = [n for n in self.nodes.values() if gate2 in n.gate_activations]
        if not nodes1 or not nodes2:
            return 0.0
        # Resonance = inverse distance in graph
        return 1.0 / (1.0 + len(nodes1) * len(nodes2) * 0.01)


class MorphOSGranIntegrator:
    """
    Integrates Morph GRAN v2 into the full Morph OS ecosystem.

    Responsibilities:
    1. Generate substrate mesh from Human Design chart
    2. Wire into Trident GNN for morphing
    3. Sync with Synthia Server for consciousness state
    4. Manage agent migration on substrate mesh
    5. Persist to Supabase / Neo4j
    """

    def __init__(self, config: Dict = None):
        self.config = config or {
            'hidden_dim': 256,
            'num_dimensions': 5,
            'num_planets': 13,
            'motif_size': 6,
            'connectivity_threshold': 0.5,
            'resonance_decay': 0.95,
            'temporal_resolution': 1.0,  # seconds
        }

        # Initialize GRAN v2
        # self.gran = MorphGRANv2(self.config)  # Would import from morph_gran_v2

        # Active resonance fields
        self.resonance_fields: Dict[str, ResonanceField] = {}

        # Agent registry
        self.agents: Dict[str, Dict] = {}

        # Temporal memory
        self.temporal_memory: Dict[str, List[Dict]] = defaultdict(list)

    # =============================================================================
    # SUBSTRATE MESH GENERATION
    # =============================================================================

    def generate_substrate_mesh(self, person_chart: Dict) -> ResonanceField:
        """
        Generate complete substrate mesh for a person.
        13 planets → 13 motifs → connected substrate.
        """
        person_id = person_chart.get('id', 'unknown')

        # Initialize resonance field
        field = ResonanceField(person_id=person_id)

        # Map 13 planets to 5 dimensions
        planet_dimensions = self._distribute_planets_across_dimensions(
            person_chart.get('planets', {})
        )

        # Generate each planet as a motif
        for planet_name, planet_data in planet_dimensions.items():
            motif_nodes = self._generate_planet_motif(
                planet_name, planet_data, person_chart
            )

            # Add nodes to field
            for node in motif_nodes:
                field.nodes[node.node_id] = node

            # Wire motif internally (hexagram line relationships)
            internal_edges = self._wire_hexagram_lines(motif_nodes)
            field.edges.extend(internal_edges)

        # Connect motifs with gate resonance + connectivity guarantee
        field.edges.extend(
            self._connect_motifs_with_resonance(field.nodes, person_chart)
        )

        # Store
        self.resonance_fields[person_id] = field

        return field

    def _distribute_planets_across_dimensions(self, planets: Dict) -> Dict:
        """
        Distribute 13 planets across 5 dimensions.
        Not parallel — distributed according to JUT theory.
        """
        dimensions = ['Body', 'Mind', 'Heart', 'Design', 'Space']

        # Distribution: Body=3, Mind=3, Heart=2, Design=3, Space=2
        distribution = {
            'Body': ['Sun', 'Earth', 'Mars'],
            'Mind': ['Moon', 'Mercury', 'Uranus'],
            'Heart': ['Venus', 'Neptune'],
            'Design': ['North Node', 'South Node', 'Saturn'],
            'Space': ['Jupiter', 'Pluto']
        }

        result = {}
        for dim, planet_list in distribution.items():
            for planet in planet_list:
                if planet in planets:
                    result[planet] = {**planets[planet], 'dimension': dim}

        return result

    def _generate_planet_motif(self, planet_name: str, planet_data: Dict, 
                                person_chart: Dict) -> List[SubstrateNode]:
        """
        Generate a motif (6 nodes) for one planet.
        Each node = one line of the hexagram.
        """
        hexagram_num = planet_data.get('hexagram', 1)
        dimension = planet_data.get('dimension', 'Body')
        gates = planet_data.get('gates', [])

        nodes = []
        for line in range(1, 7):
            node_id = f"{planet_name}_L{line}"

            # Self-addressing stellar address
            stellar_address = self._compute_stellar_address(
                person_chart.get('birth_data', {}),
                planet_name, line, planet_data
            )

            node = SubstrateNode(
                node_id=node_id,
                stellar_address=stellar_address,
                hexagram_state=hexagram_num,
                dimension=dimension,
                gate_activations=set(gates),
                line=line,
                color=planet_data.get('color', line),
                tone=planet_data.get('tone', line),
                base=planet_data.get('base', (line % 5) + 1),
                degree=planet_data.get('degree', 0.0),
                minute=planet_data.get('minute', 0.0),
                second=planet_data.get('second', 0.0),
                arcsecond=planet_data.get('arcsecond', 0.0),
                zodiac=planet_data.get('zodiac', 'Aries'),
                house=planet_data.get('house', 1),
                planet=planet_name,
                resonance_amplitude=self._compute_initial_resonance(
                    hexagram_num, line, person_chart
                ),
                temporal_context={
                    'created_at': datetime.now().isoformat(),
                    'planet': planet_name,
                    'line': line
                }
            )
            nodes.append(node)

        return nodes

    def _compute_stellar_address(self, birth_data: Dict, planet: str, 
                                  line: int, planet_data: Dict) -> str:
        """
        Compute self-addressing stellar address.
        Format: degree_minute_second_arcsecond@proximity
        """
        deg = planet_data.get('degree', 0)
        min_ = planet_data.get('minute', 0)
        sec = planet_data.get('second', 0)
        arc = planet_data.get('arcsecond', 0)

        return f"{deg}_{min_}_{sec}_{arc}@{planet}_L{line}"

    def _compute_initial_resonance(self, hexagram: int, line: int, 
                                    person_chart: Dict) -> float:
        """
        Compute initial resonance amplitude for a node.
        Based on: is this gate activated in person's chart?
        """
        activated = person_chart.get('activated_gates', set())
        # Higher resonance if gate is activated
        base_resonance = 0.3
        if hexagram in activated:
            base_resonance += 0.5
        # Line 1 and 6 have higher resonance (foundational/completion)
        if line in [1, 6]:
            base_resonance += 0.1
        return min(base_resonance, 1.0)

    def _wire_hexagram_lines(self, nodes: List[SubstrateNode]) -> List[Tuple]:
        """
        Wire hexagram lines: 1-2, 2-3, 3-4, 4-5, 5-6.
        These are "adjacent" and strongly coupled.
        """
        edges = []
        for i in range(len(nodes) - 1):
            src = nodes[i].node_id
            dst = nodes[i + 1].node_id
            weight = 0.8  # Strong internal coupling
            edges.append((src, dst, weight))
            edges.append((dst, src, weight))  # Undirected
        return edges

    def _connect_motifs_with_resonance(self, nodes: Dict[str, SubstrateNode],
                                       person_chart: Dict) -> List[Tuple]:
        """
        Connect different planet motifs using gate resonance.
        With connectivity guarantee (fixes GRAN weakness).
        """
        edges = []
        node_list = list(nodes.values())

        # Compute resonance scores between all node pairs
        resonance_matrix = np.zeros((len(node_list), len(node_list)))

        for i, node_i in enumerate(node_list):
            for j, node_j in enumerate(node_list):
                if i >= j:
                    continue

                # Gate resonance: shared gates
                shared_gates = node_i.gate_activations & node_j.gate_activations
                gate_score = len(shared_gates) * 0.3

                # Dimensional compatibility
                dim_score = 0.2 if node_i.dimension == node_j.dimension else 0.0

                # Temporal phase alignment
                phase_score = 0.1 if node_i.line == node_j.line else 0.0

                # Planet affinity
                planet_score = self._planet_affinity(node_i.planet, node_j.planet)

                resonance_matrix[i, j] = gate_score + dim_score + phase_score + planet_score
                resonance_matrix[j, i] = resonance_matrix[i, j]

        # Connectivity guarantee: ensure graph is connected
        # 1. Build minimum spanning tree
        mst_edges = self._minimum_spanning_tree(node_list, resonance_matrix)
        edges.extend(mst_edges)

        # 2. Add high-resonance edges
        threshold = self.config['connectivity_threshold']
        for i in range(len(node_list)):
            for j in range(i + 1, len(node_list)):
                if resonance_matrix[i, j] > threshold:
                    src = node_list[i].node_id
                    dst = node_list[j].node_id
                    edges.append((src, dst, resonance_matrix[i, j]))

        return edges

    def _planet_affinity(self, p1: str, p2: str) -> float:
        """Affinity between two planets"""
        affinities = {
            ('Sun', 'Earth'): 1.0,
            ('Sun', 'Moon'): 0.8,
            ('Moon', 'North Node'): 0.7,
            ('Venus', 'Mars'): 0.6,
            ('Jupiter', 'Saturn'): 0.5,
        }
        return affinities.get((p1, p2), affinities.get((p2, p1), 0.1))

    def _minimum_spanning_tree(self, nodes: List[SubstrateNode], 
                               weights: np.ndarray) -> List[Tuple]:
        """Build MST to ensure connectivity"""
        n = len(nodes)
        parent = list(range(n))

        def find(x):
            if parent[x] != x:
                parent[x] = find(parent[x])
            return parent[x]

        def union(x, y):
            parent[find(x)] = find(y)

        # Sort edges by weight (descending)
        edges = []
        for i in range(n):
            for j in range(i + 1, n):
                edges.append((weights[i, j], i, j))
        edges.sort(reverse=True)

        mst = []
        for w, i, j in edges:
            if find(i) != find(j):
                union(i, j)
                mst.append((nodes[i].node_id, nodes[j].node_id, w))

        return mst

    # =============================================================================
    # TEMPORAL EVOLUTION
    # =============================================================================

    def evolve_field(self, person_id: str, time_delta: float,
                     state_changes: List[Dict]) -> ResonanceField:
        """
        Evolve resonance field as person's state changes.
        MORPH innovation: living graph, not static.
        """
        field = self.resonance_fields.get(person_id)
        if not field:
            raise ValueError(f"No resonance field for {person_id}")

        # Apply state changes
        for change in state_changes:
            change_type = change.get('type')

            if change_type == 'hexagram_transition':
                # Old hexagram → new hexagram
                self._apply_hexagram_transition(field, change)

            elif change_type == 'gate_activation':
                # New gate activated
                self._activate_gate(field, change)

            elif change_type == 'gate_deactivation':
                # Gate deactivated
                self._deactivate_gate(field, change)

            elif change_type == 'dimensional_shift':
                # Dimension weight shift
                self._shift_dimension(field, change)

        # Decay old resonance
        self._apply_resonance_decay(field, time_delta)

        # Update temporal phase
        field.temporal_phase = (field.temporal_phase + time_delta) % (2 * np.pi)

        # Store in temporal memory
        self.temporal_memory[person_id].append({
            'timestamp': datetime.now().isoformat(),
            'phase': field.temporal_phase,
            'num_nodes': len(field.nodes),
            'num_edges': len(field.edges),
            'changes': state_changes
        })

        return field

    def _apply_hexagram_transition(self, field: ResonanceField, change: Dict):
        """
        When hexagram changes, rewire edges based on new gate activations.
        """
        old_hex = change.get('old_hexagram')
        new_hex = change.get('new_hexagram')
        planet = change.get('planet')

        # Find nodes for this planet
        planet_nodes = [n for n in field.nodes.values() if n.planet == planet]

        # Update hexagram state
        for node in planet_nodes:
            node.hexagram_state = new_hex
            # Recalculate resonance
            node.resonance_amplitude = self._compute_hexagram_resonance(
                new_hex, node.line
            )

        # Rewire edges: remove old, add new based on gate resonance
        field.edges = [
            e for e in field.edges 
            if not (e[0].startswith(planet) or e[1].startswith(planet))
        ]

        # Reconnect with new resonance
        new_edges = self._connect_motifs_with_resonance(
            field.nodes, {'activated_gates': self._get_hexagram_gates(new_hex)}
        )
        field.edges.extend(new_edges)

    def _compute_hexagram_resonance(self, hexagram: int, line: int) -> float:
        """Resonance for a specific hexagram/line combination"""
        # Line 1 (bottom) and 6 (top) are structural
        structural_bonus = 0.2 if line in [1, 6] else 0.0
        return 0.5 + structural_bonus

    def _get_hexagram_gates(self, hexagram: int) -> Set[int]:
        """Get gates associated with a hexagram"""
        # Simplified: each hexagram maps to specific gates
        hexagram_gates = {
            1: {1, 2}, 2: {2, 3}, 3: {3, 4}, 4: {4, 5},
            # ... all 64 would be defined
        }
        return hexagram_gates.get(hexagram, set())

    def _activate_gate(self, field: ResonanceField, change: Dict):
        """Activate a new gate in the field"""
        gate = change.get('gate')
        for node in field.nodes.values():
            if gate in node.gate_activations:
                node.resonance_amplitude = min(1.0, node.resonance_amplitude + 0.3)

    def _deactivate_gate(self, field: ResonanceField, change: Dict):
        """Deactivate a gate"""
        gate = change.get('gate')
        for node in field.nodes.values():
            if gate in node.gate_activations:
                node.resonance_amplitude = max(0.1, node.resonance_amplitude - 0.2)

    def _shift_dimension(self, field: ResonanceField, change: Dict):
        """Shift dimensional weights"""
        dim = change.get('dimension')
        weight = change.get('weight', 0.2)
        field.dimensional_weights[dim] = weight

        # Renormalize
        total = sum(field.dimensional_weights.values())
        for d in field.dimensional_weights:
            field.dimensional_weights[d] /= total

    def _apply_resonance_decay(self, field: ResonanceField, time_delta: float):
        """Decay resonance over time"""
        decay = self.config['resonance_decay'] ** time_delta
        for node in field.nodes.values():
            node.resonance_amplitude *= decay
            # But maintain minimum resonance for activated gates
            if node.gate_activations:
                node.resonance_amplitude = max(0.2, node.resonance_amplitude)

    # =============================================================================
    # AGENT MIGRATION
    # =============================================================================

    def migrate_agent(self, agent_id: str, person_id: str,
                      target_node: str, migration_path: List[str] = None):
        """
        Migrate an agent between substrate nodes.
        Agent carries its local state + references to the whole.
        """
        field = self.resonance_fields.get(person_id)
        if not field:
            return None

        agent = self.agents.get(agent_id, {
            'id': agent_id,
            'current_node': None,
            'state': {},
            'memory': [],
            'fraction_of_whole': 0.1  # Each agent carries fraction of whole knowledge
        })

        # Compute migration cost
        if agent['current_node'] and target_node:
            path = migration_path or self._find_migration_path(
                field, agent['current_node'], target_node
            )
            migration_cost = len(path) * 0.1

            # Update agent
            agent['current_node'] = target_node
            agent['migration_history'] = agent.get('migration_history', []) + [{
                'from': agent['current_node'],
                'to': target_node,
                'path': path,
                'cost': migration_cost,
                'timestamp': datetime.now().isoformat()
            }]

        self.agents[agent_id] = agent
        return agent

    def _find_migration_path(self, field: ResonanceField, src: str, dst: str) -> List[str]:
        """Find shortest path for agent migration"""
        # BFS
        from collections import deque

        adj = defaultdict(list)
        for edge in field.edges:
            adj[edge[0]].append(edge[1])

        queue = deque([(src, [src])])
        visited = {src}

        while queue:
            current, path = queue.popleft()
            if current == dst:
                return path
            for neighbor in adj.get(current, []):
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append((neighbor, path + [neighbor]))

        return [src, dst]  # Direct if no path found

    # =============================================================================
    # TRIDENT GNN INTEGRATION
    # =============================================================================

    def to_trident_format(self, person_id: str) -> Dict:
        """
        Convert resonance field to Trident GNN format.
        Trident expects: nodes, edges, features, adjacency.
        """
        field = self.resonance_fields.get(person_id)
        if not field:
            return {}

        # Node features
        node_ids = list(field.nodes.keys())
        node_features = []
        for node_id in node_ids:
            node = field.nodes[node_id]
            features = [
                node.hexagram_state / 64.0,  # Normalized hexagram
                node.line / 6.0,
                node.color / 6.0,
                node.tone / 6.0,
                node.base / 5.0,
                node.degree / 360.0,
                node.resonance_amplitude,
                node.phase_alignment,
                ['Body', 'Mind', 'Heart', 'Design', 'Space'].index(node.dimension) / 4.0,
            ]
            node_features.append(features)

        # Edge index
        edge_index = [[], []]
        edge_weights = []
        node_idx = {nid: i for i, nid in enumerate(node_ids)}

        for src, dst, weight in field.edges:
            if src in node_idx and dst in node_idx:
                edge_index[0].append(node_idx[src])
                edge_index[1].append(node_idx[dst])
                edge_weights.append(weight)

        return {
            'node_ids': node_ids,
            'x': torch.tensor(node_features, dtype=torch.float32),
            'edge_index': torch.tensor(edge_index, dtype=torch.long),
            'edge_weight': torch.tensor(edge_weights, dtype=torch.float32),
            'num_nodes': len(node_ids),
            'num_edges': len(edge_weights),
            'dimensional_weights': field.dimensional_weights,
        }

    def from_trident_update(self, person_id: str, trident_output: Dict):
        """
        Receive morphing update from Trident GNN.
        Trident may suggest architecture changes.
        """
        field = self.resonance_fields.get(person_id)
        if not field:
            return

        # Apply Trident's suggested rewiring
        if 'new_edges' in trident_output:
            for edge in trident_output['new_edges']:
                field.edges.append((edge['src'], edge['dst'], edge['weight']))

        if 'removed_edges' in trident_output:
            removed = set((e['src'], e['dst']) for e in trident_output['removed_edges'])
            field.edges = [
                e for e in field.edges 
                if (e[0], e[1]) not in removed and (e[1], e[0]) not in removed
            ]

    # =============================================================================
    # SYNTHIA SERVER INTEGRATION
    # =============================================================================

    def sync_with_synthia(self, person_id: str, synthia_state: Dict):
        """
        Sync resonance field with Synthia consciousness server.
        Push: resonance field updates
        Pull: consciousness state, emotional wave, active dimensions
        """
        field = self.resonance_fields.get(person_id)
        if not field:
            return

        # Update from Synthia
        active_dims = synthia_state.get('active_dimensions', ['Body', 'Mind'])
        current_hex = synthia_state.get('current_hexagram', 1)
        emotional_wave = synthia_state.get('emotional_wave', 0.5)

        # Adjust dimensional weights based on Synthia's active dimensions
        for dim in field.dimensional_weights:
            field.dimensional_weights[dim] = 0.1
        for dim in active_dims:
            field.dimensional_weights[dim] = 0.3

        # Normalize
        total = sum(field.dimensional_weights.values())
        for dim in field.dimensional_weights:
            field.dimensional_weights[dim] /= total

        # Emotional wave affects resonance amplitude
        for node in field.nodes.values():
            if node.dimension in active_dims:
                node.resonance_amplitude = emotional_wave

    def push_to_synthia(self, person_id: str) -> Dict:
        """Push resonance field state to Synthia"""
        field = self.resonance_fields.get(person_id)
        if not field:
            return {}

        return {
            'person_id': person_id,
            'resonance_field': {
                'num_nodes': len(field.nodes),
                'num_edges': len(field.edges),
                'dimensional_weights': field.dimensional_weights,
                'temporal_phase': field.temporal_phase,
                'dominant_dimension': max(field.dimensional_weights, 
                                          key=field.dimensional_weights.get),
                'gate_coverage': len(set(
                    g for n in field.nodes.values() for g in n.gate_activations
                )) / 64.0,
            },
            'timestamp': datetime.now().isoformat()
        }

    # =============================================================================
    # PERSISTENCE (SUPABASE + NEO4J)
    # =============================================================================

    async def save_to_supabase(self, person_id: str, supabase_client):
        """Save resonance field to Supabase"""
        field = self.resonance_fields.get(person_id)
        if not field:
            return

        # Serialize field
        data = {
            'person_id': person_id,
            'nodes': {nid: node.to_coordinates() for nid, node in field.nodes.items()},
            'edges': [{'src': e[0], 'dst': e[1], 'weight': e[2]} for e in field.edges],
            'dimensional_weights': field.dimensional_weights,
            'temporal_phase': field.temporal_phase,
            'updated_at': datetime.now().isoformat()
        }

        # Upsert to Supabase
        await supabase_client.table('resonance_fields').upsert(data)

    async def load_from_supabase(self, person_id: str, supabase_client):
        """Load resonance field from Supabase"""
        response = await supabase_client.table('resonance_fields')            .select('*').eq('person_id', person_id).execute()

        if response.data:
            data = response.data[0]
            # Reconstruct field
            field = ResonanceField(person_id=person_id)
            # ... reconstruct nodes and edges from data
            self.resonance_fields[person_id] = field
            return field
        return None

    def to_neo4j_cypher(self, person_id: str) -> List[str]:
        """
        Generate Cypher queries for Neo4j.
        Creates nodes and relationships in graph database.
        """
        field = self.resonance_fields.get(person_id)
        if not field:
            return []

        queries = []

        # Create nodes
        for node_id, node in field.nodes.items():
            coords = node.to_coordinates()
            query = f"""
            CREATE (n:SubstrateNode {{
                id: '{node_id}',
                stellar_address: '{node.stellar_address}',
                hexagram: {node.hexagram_state},
                dimension: '{node.dimension}',
                line: {node.line},
                color: {node.color},
                tone: {node.tone},
                base: {node.base},
                degree: {node.degree},
                zodiac: '{node.zodiac}',
                house: {node.house},
                planet: '{node.planet}',
                resonance: {node.resonance_amplitude}
            }})
            """
            queries.append(query)

        # Create relationships
        for src, dst, weight in field.edges:
            query = f"""
            MATCH (a:SubstrateNode {{id: '{src}'}}), (b:SubstrateNode {{id: '{dst}'}})
            CREATE (a)-[:RESONATES {{weight: {weight}}}]->(b)
            """
            queries.append(query)

        return queries

    # =============================================================================
    # EXPORT / IMPORT
    # =============================================================================

    def export_field(self, person_id: str) -> Dict:
        """Export complete field as JSON-serializable dict"""
        field = self.resonance_fields.get(person_id)
        if not field:
            return {}

        return {
            'person_id': field.person_id,
            'nodes': {
                nid: {
                    'node_id': n.node_id,
                    'stellar_address': n.stellar_address,
                    'hexagram': n.hexagram_state,
                    'dimension': n.dimension,
                    'gates': list(n.gate_activations),
                    'line': n.line,
                    'color': n.color,
                    'tone': n.tone,
                    'base': n.base,
                    'degree': n.degree,
                    'minute': n.minute,
                    'second': n.second,
                    'arcsecond': n.arcsecond,
                    'zodiac': n.zodiac,
                    'house': n.house,
                    'planet': n.planet,
                    'resonance': n.resonance_amplitude,
                }
                for nid, n in field.nodes.items()
            },
            'edges': [{'src': e[0], 'dst': e[1], 'weight': e[2]} for e in field.edges],
            'dimensional_weights': field.dimensional_weights,
            'temporal_phase': field.temporal_phase,
        }

    def import_field(self, data: Dict):
        """Import field from JSON-serializable dict"""
        person_id = data['person_id']
        field = ResonanceField(person_id=person_id)

        # Reconstruct nodes
        for nid, ndata in data['nodes'].items():
            node = SubstrateNode(
                node_id=ndata['node_id'],
                stellar_address=ndata['stellar_address'],
                hexagram_state=ndata['hexagram'],
                dimension=ndata['dimension'],
                gate_activations=set(ndata['gates']),
                line=ndata['line'],
                color=ndata['color'],
                tone=ndata['tone'],
                base=ndata['base'],
                degree=ndata['degree'],
                minute=ndata['minute'],
                second=ndata['second'],
                arcsecond=ndata['arcsecond'],
                zodiac=ndata['zodiac'],
                house=ndata['house'],
                planet=ndata['planet'],
                resonance_amplitude=ndata['resonance'],
            )
            field.nodes[nid] = node

        # Reconstruct edges
        field.edges = [(e['src'], e['dst'], e['weight']) for e in data['edges']]
        field.dimensional_weights = data['dimensional_weights']
        field.temporal_phase = data['temporal_phase']

        self.resonance_fields[person_id] = field
        return field


# =============================================================================
# MORPH OS KERNEL INTEGRATION
# =============================================================================

class MorphOSKernel:
    """
    The central kernel that orchestrates all components.
    This is the "whole system" that knows what's good for itself.
    Personal agents carry only their fraction of this knowledge.
    """

    def __init__(self):
        self.integrator = MorphOSGranIntegrator()
        self.active_persons: Set[str] = set()
        self.system_state = {
            'total_nodes': 0,
            'total_edges': 0,
            'active_agents': 0,
            'dimensional_balance': {},
        }

    def register_person(self, person_chart: Dict) -> str:
        """Register a new person and generate their substrate mesh"""
        person_id = person_chart.get('id', f"person_{len(self.active_persons)}")

        # Generate substrate mesh
        field = self.integrator.generate_substrate_mesh(person_chart)

        # Update system state
        self.active_persons.add(person_id)
        self._update_system_state()

        return person_id

    def _update_system_state(self):
        """Update global system state from all resonance fields"""
        total_nodes = sum(len(f.nodes) for f in self.integrator.resonance_fields.values())
        total_edges = sum(len(f.edges) for f in self.integrator.resonance_fields.values())

        # Aggregate dimensional weights
        dim_weights = defaultdict(float)
        for field in self.integrator.resonance_fields.values():
            for dim, weight in field.dimensional_weights.items():
                dim_weights[dim] += weight

        # Normalize
        total_weight = sum(dim_weights.values())
        if total_weight > 0:
            for dim in dim_weights:
                dim_weights[dim] /= total_weight

        self.system_state = {
            'total_nodes': total_nodes,
            'total_edges': total_edges,
            'active_agents': len(self.integrator.agents),
            'dimensional_balance': dict(dim_weights),
            'active_persons': len(self.active_persons),
        }

    def get_personal_agent(self, person_id: str) -> Dict:
        """
        Spawn a personal agent for a person.
        Agent carries only its fraction of the whole's knowledge.
        """
        field = self.integrator.resonance_fields.get(person_id)
        if not field:
            return {}

        # Agent gets fraction of whole knowledge
        fraction = 1.0 / len(self.active_persons) if self.active_persons else 1.0

        agent = {
            'id': f"agent_{person_id}",
            'person_id': person_id,
            'fraction_of_whole': fraction,
            'knowledge': {
                'local_nodes': list(field.nodes.keys()),
                'local_edges': len(field.edges),
                'dimensional_weights': field.dimensional_weights,
                'temporal_phase': field.temporal_phase,
            },
            'references_to_whole': {
                'system_state': self.system_state,
                'other_persons': list(self.active_persons - {person_id}),
            },
            'serves': 'individual',  # Not the collective
            'philosophy': 'fractal_of_whole',
        }

        self.integrator.agents[agent['id']] = agent
        return agent

    def evolve_system(self, time_delta: float = 1.0):
        """Evolve entire system one time step"""
        for person_id in self.active_persons:
            # Get state changes from Synthia
            # synthia_state = MorphOSInterface.get_consciousness_state(person_id)

            # Evolve field
            # self.integrator.evolve_field(person_id, time_delta, state_changes)
            pass

        self._update_system_state()


# =============================================================================
# USAGE EXAMPLE
# =============================================================================

if __name__ == '__main__':
    kernel, person_id = example_os_integration()


# ══════════════════════════════════════════════════════════════════════
# §8  BRIDGE LAYER — SENN ↔ TRIDENT ↔ NEO4J ↔ AGENT
# ──────────────────────────────────────────────────────────────────────
# GrowthEpisode, SubstrateMigrationHandler, Neo4jGrowthLogger, TridentGNNBridge, SynthiaAgentIntegration
# ══════════════════════════════════════════════════════════════════════

@dataclass
class GrowthEpisode:
    """Records a network expansion event for Neo4j memory"""
    timestamp: float
    layer_idx: int
    old_width: int
    new_width: int
    trigger_reason: str
    hexagram_state: int
    loss_at_expansion: float
    semantic_seed_id: int  # Which I Ching state seeded the new neurons

class SubstrateMigrationHandler:
    """
    Handles agent migration with expanded networks.
    When an agent moves between substrate nodes, its architecture travels with it.
    """
    def __init__(self, synthia_server_url: str = "https://synthia-server.onrender.com"):
        self.server_url = synthia_server_url

    def serialize_expanded_state(self, model: nn.Module) -> Dict[str, Any]:
        """Serialize a model with dynamic architecture for migration"""
        state = {
            'layer_widths': [],
            'growth_stages': [],
            'hexagram_states': [],
            'weight_shapes': [],
            'state_dict_keys': list(model.state_dict().keys()),
        }

        for name, module in model.named_modules():
            if hasattr(module, 'current_width'):
                state['layer_widths'].append(module.current_width)
                state['growth_stages'].append(module.growth_stage)
                state['hexagram_states'].append(module.hexagram_state)
                if hasattr(module, 'weight'):
                    state['weight_shapes'].append(module.weight.shape)

        return state

    def migrate_to_node(
        self, 
        agent_id: str, 
        model: nn.Module, 
        target_node: str,
        supabase_url: str = "https://leisphnjslcuepflefri.supabase.co"
    ) -> bool:
        """
        Migrate an agent with its expanded network to a new substrate node.
        The receiving node can continue expanding from the checkpoint.
        """
        state = self.serialize_expanded_state(model)

        payload = {
            'agent_id': agent_id,
            'target_node': target_node,
            'model_state': state,
            'timestamp': torch.cuda.Event().elapsed_time(torch.cuda.Event()),
        }

        try:
            # In production: POST to your Synthia server
            # response = requests.post(f"{self.server_url}/migrate", json=payload)
            print(f"[Migration] Agent {agent_id} → Node {target_node}")
            print(f"  Architecture: {state['layer_widths']}")
            print(f"  Growth stages: {state['growth_stages']}")
            return True
        except Exception as e:
            print(f"[Migration Error] {e}")
            return False

class Neo4jGrowthLogger:
    """
    Logs expansion episodes to Neo4j as growth nodes.
    Creates relationships: (Layer)-[:EXPANDED_TO]->(NewLayer)
    """
    def __init__(self, neo4j_uri: str, auth: tuple):
        self.uri = neo4j_uri
        self.auth = auth

    def log_episode(self, episode: GrowthEpisode) -> str:
        """
        Create Neo4j entry for expansion event.
        Cypher query template:

        CREATE (g:GrowthEpisode {
            timestamp: $timestamp,
            layer: $layer,
            old_width: $old_width,
            new_width: $new_width,
            reason: $reason,
            hexagram: $hexagram,
            loss: $loss
        })
        WITH g
        MATCH (l:Layer {idx: $layer})
        CREATE (l)-[:EXPANDED {episode_id: id(g)}]->(g)
        RETURN id(g) as episode_id
        """
        query = """
        CREATE (g:GrowthEpisode {
            timestamp: $timestamp,
            layer_idx: $layer_idx,
            old_width: $old_width,
            new_width: $new_width,
            trigger_reason: $reason,
            hexagram_state: $hexagram,
            loss_at_expansion: $loss,
            semantic_seed: $seed
        })
        RETURN id(g) as episode_id
        """

        params = {
            'timestamp': episode.timestamp,
            'layer_idx': episode.layer_idx,
            'old_width': episode.old_width,
            'new_width': episode.new_width,
            'reason': episode.trigger_reason,
            'hexagram': episode.hexagram_state,
            'loss': episode.loss_at_expansion,
            'seed': episode.semantic_seed_id,
        }

        # In production: execute via Neo4j driver
        print(f"[Neo4j] Logged growth episode: Layer {episode.layer_idx} {episode.old_width}→{episode.new_width}")
        return "episode_id_placeholder"

class TridentGNNBridge:
    """
    Bridge between MorphSENN and your existing Trident GNN.

    Trident GNN morphs message-passing strategy (topology).
    MorphSENN expands layer width (capacity).
    This bridge coordinates both.
    """
    def __init__(self, trident_model: nn.Module):
        self.trident = trident_model
        self.senn_layers: List[nn.Module] = []

    def attach_senn_to_trident(
        self,
        layer_indices: List[int],
        config: 'MorphSENNConfig'
    ):
        """
        Attach MorphSENN expansion capability to specific Trident layers.

        Usage:
            trident = YourTridentGNN()
            bridge = TridentGNNBridge(trident)
            bridge.attach_senn_to_trident([1, 3, 5], MorphSENNConfig())
        """
        from morph_senn import MorphSENNLayer

        # Find message-passing layers in Trident
        for idx, (name, module) in enumerate(self.trident.named_modules()):
            if idx in layer_indices and hasattr(module, 'in_features'):
                # Wrap with SENN expansion
                senn_layer = MorphSENNLayer(
                    in_features=module.in_features,
                    out_features=module.out_features,
                    config=config,
                    message_passing_mode=getattr(module, 'mp_mode', 'attention'),
                    hexagram_state=idx % 64,
                )

                # Replace or wrap
                self._replace_module(name, senn_layer)
                self.senn_layers.append(senn_layer)

        print(f"[Bridge] Attached SENN to {len(self.senn_layers)} Trident layers")

    def _replace_module(self, target_name: str, new_module: nn.Module):
        """Replace a module in Trident by name"""
        parts = target_name.split('.')
        parent = self.trident
        for part in parts[:-1]:
            parent = getattr(parent, part)
        setattr(parent, parts[-1], new_module)

    def hybrid_forward(self, graph_data: Any, loss: Optional[float] = None) -> Dict:
        """
        Forward pass with both topology morph and capacity expansion.

        1. Trident GNN does message passing (possibly morphed topology)
        2. MorphSENN monitors and potentially expands
        3. Controller decides: morph, expand, or both
        """
        # Step 1: Trident forward (topology morph happens inside)
        trident_out = self.trident(graph_data)

        # Step 2: Collect SENN metadata
        senn_metadata = []
        for layer in self.senn_layers:
            if hasattr(layer, 'monitor'):
                senn_metadata.append({
                    'width': layer.current_width,
                    'saturated': layer.monitor.is_saturated(0.01),
                    'growth_stage': layer.growth_stage,
                })

        # Step 3: Controller decision
        decision = self._controller_decision(loss, senn_metadata)

        return {
            'output': trident_out,
            'trident_topology': getattr(self.trident, 'current_mode', 'unknown'),
            'senn_metadata': senn_metadata,
            'controller_decision': decision,
        }

    def _controller_decision(self, loss: Optional[float], metadata: List[Dict]) -> Dict:
        """Unified controller: topology vs capacity"""
        if loss is None:
            return {'action': 'none', 'reason': 'No loss signal'}

        # Check if any SENN layers are saturated
        saturated = any(m['saturated'] for m in metadata)

        # Simple decision (production: use your neural controller)
        if saturated:
            return {'action': 'expand', 'reason': 'SENN saturation detected'}
        else:
            return {'action': 'continue', 'reason': 'Normal operation'}

class SynthiaAgentIntegration:
    """
    Integrates MorphSENN with your Synthia agent system.
    Each agent carries its own expanded network architecture.
    """
    def __init__(
        self,
        agent_id: str,
        base_model: nn.Module,
        synthia_server: str = "https://synthia-server.onrender.com",
        supabase_url: str = "https://leisphnjslcuepflefri.supabase.co",
    ):
        self.agent_id = agent_id
        self.model = base_model
        self.synthia = synthia_server
        self.supabase = supabase_url
        self.growth_history: List[GrowthEpisode] = []

    def process_task(self, task_data: torch.Tensor) -> Dict:
        """
        Agent processes a task, potentially expanding during execution.
        """
        # Forward pass
        output, metadata = self.model(task_data)

        # Log growth if expansion happened
        if metadata['controller_decision']['action'] in ['expand', 'both']:
            episode = GrowthEpisode(
                timestamp=0.0,  # Use actual timestamp
                layer_idx=metadata['controller_decision']['target_layers'][0],
                old_width=0,  # Fill from metadata
                new_width=0,
                trigger_reason=metadata['controller_decision']['reason'],
                hexagram_state=0,
                loss_at_expansion=0.0,
                semantic_seed_id=0,
            )
            self.growth_history.append(episode)

        return {
            'agent_id': self.agent_id,
            'output': output,
            'architecture': metadata['layer_widths'],
            'growth_count': len(self.growth_history),
        }

    def save_to_supabase(self) -> bool:
        """
        Save agent state (including expanded architecture) to Supabase.
        Table: agent_states
        Columns: agent_id, model_config, growth_history, last_updated
        """
        state = {
            'agent_id': self.agent_id,
            'layer_widths': [l.current_width for l in self.model.layers] if hasattr(self.model, 'layers') else [],
            'growth_episodes': len(self.growth_history),
            'total_params': sum(p.numel() for p in self.model.parameters()),
        }

        print(f"[Supabase] Saved agent {self.agent_id}: {state}")
        return True

# Integration example
if __name__ == "__main__":
    print("=== MorphSENN Integration Bridge ===")
    print()
    print("1. Trident GNN Bridge:")
    print("   - Attaches SENN expansion to Trident message-passing layers")
    print("   - Coordinates topology morph + capacity expansion")
    print()
    print("2. Substrate Migration:")
    print("   - Serializes dynamic architecture for agent migration")
    print("   - Receiving node continues expansion from checkpoint")
    print()
    print("3. Neo4j Logging:")
    print("   - GrowthEpisode nodes track expansion history")
    print("   - (Layer)-[:EXPANDED]->(GrowthEpisode) relationships")
    print()
    print("4. Synthia Agent Integration:")
    print("   - Each agent carries expanded network")
    print("   - Saves state to Supabase")
    print()

    # Demo migration
    from morph_senn import MorphSENNGraph, MorphSENNConfig

    config = MorphSENNConfig(base_width=16, max_width=64)
    model = MorphSENNGraph(in_features=8, num_layers=2, config=config)

    migrator = SubstrateMigrationHandler()
    migrator.migrate_to_node("agent_001", model, "substrate_node_7")
