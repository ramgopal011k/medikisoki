"""
MediKiosk - Model Fine-Tuning Script
Demonstrates QLoRA fine-tuning of Llama-3/Medra-4B on Indian OPD dialogues.
For Hackathon Demonstration Purposes.
"""

import os
import torch
from datasets import load_dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments
)
from trl import SFTTrainer
from peft import LoraConfig, prepare_model_for_kbit_training, get_peft_model

# 1. Configuration
MODEL_NAME = "meta-llama/Meta-Llama-3-8B-Instruct" # Or a Medra variant
DATASET_PATH = "opd_dialogues.jsonl"
OUTPUT_DIR = "./medikiosk-model"

# 2. QLoRA Configuration (4-bit quantization for GPU efficiency)
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_use_double_quant=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16
)

# 3. Load Model and Tokenizer
def load_model_and_tokenizer():
    print(f"Loading {MODEL_NAME} with 4-bit quantization...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    tokenizer.pad_token = tokenizer.eos_token
    
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        quantization_config=bnb_config,
        device_map="auto"
    )
    
    model = prepare_model_for_kbit_training(model)
    return model, tokenizer

# 4. LoRA Configuration
lora_config = LoraConfig(
    r=16, 
    lora_alpha=32,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM"
)

# 5. Format Dataset
def format_prompt(example):
    """Formats the instruction for the SFTTrainer"""
    system_prompt = example['system']
    user_msg = example['user']
    assistant_msg = example['assistant']
    
    # Llama 3 Prompt Format
    prompt = f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n{system_prompt}<|eot_id|>"
    prompt += f"<|start_header_id|>user<|end_header_id|>\n\n{user_msg}<|eot_id|>"
    prompt += f"<|start_header_id|>assistant<|end_header_id|>\n\n{assistant_msg}<|eot_id|>"
    
    return {"text": prompt}

# 6. Training Pipeline
def train():
    model, tokenizer = load_model_and_tokenizer()
    model = get_peft_model(model, lora_config)
    
    print("Loading dataset...")
    dataset = load_dataset("json", data_files=DATASET_PATH, split="train")
    dataset = dataset.map(format_prompt)
    
    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        per_device_train_batch_size=4,
        gradient_accumulation_steps=4,
        optim="paged_adamw_32bit",
        save_steps=50,
        logging_steps=10,
        learning_rate=2e-4,
        weight_decay=0.001,
        fp16=False,
        bf16=True, # Recommended for Ampere+ GPUs
        max_grad_norm=0.3,
        max_steps=200,
        warmup_ratio=0.03,
        group_by_length=True,
        lr_scheduler_type="cosine",
        report_to="tensorboard"
    )
    
    print("Initializing SFT Trainer...")
    trainer = SFTTrainer(
        model=model,
        train_dataset=dataset,
        peft_config=lora_config,
        dataset_text_field="text",
        max_seq_length=512,
        tokenizer=tokenizer,
        args=training_args,
    )
    
    print("Starting fine-tuning...")
    trainer.train()
    
    print("Saving the tuned model...")
    trainer.save_model(OUTPUT_DIR)
    print("Training complete! Model ready for deployment.")

if __name__ == "__main__":
    # Note: To run this, you need a GPU with at least 16GB VRAM (e.g., T4, L4, or A100)
    # pip install torch transformers peft trl datasets bitsandbytes accelerate
    # train()
    print("MediKiosk Training Script Ready.")
