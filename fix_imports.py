import os
import re

def update_imports(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Regex to match: import ... from './path' or import type ... from './path'
    # and also side-effect imports: import './path'
    # Pattern: (import|export)\s+(?:.*?\s+from\s+)?['"](\.\.?\/[^'"]+)['"]
    
    def replace_match(match):
        prefix = match.group(1)
        path = match.group(2)
        
        # If it already has an extension, don't change it
        if re.search(r'\.(js|ts|tsx|jsx|css|html|json|svg|png|jpg|jpeg|gif|webp|bmp|ico|pdf|mp3|wav|aiff|aac|ogg|flac)$', path):
            return match.group(0)
        
        # It's a relative import without extension
        new_path = path + '.js'
        return match.group(0).replace(path, new_path)

    # Simplified regex for matching the whole import line to replace carefully
    # Targets: from './something' or from "../something"
    new_content = re.sub(r"(from\s+['\"])(\.\.?\/[^'\"]+)(['\"])", replace_match_from, content)
    # Targets: import './something'
    new_content = re.sub(r"(import\s+['\"])(\.\.?\/[^'\"]+)(['\"])", replace_match_import, new_content)

    if content != new_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

def replace_match_from(match):
    before = match.group(1)
    path = match.group(2)
    after = match.group(3)
    if re.search(r'\.(js|ts|tsx|jsx|css|html|json|svg|png|jpg|jpeg|gif|webp|bmp|ico|pdf|mp3|wav|aiff|aac|ogg|flac)$', path):
        return match.group(0)
    return f"{before}{path}.js{after}"

def replace_match_import(match):
    before = match.group(1)
    path = match.group(2)
    after = match.group(3)
    if re.search(r'\.(js|ts|tsx|jsx|css|html|json|svg|png|jpg|jpeg|gif|webp|bmp|ico|pdf|mp3|wav|aiff|aac|ogg|flac)$', path):
        return match.group(0)
    return f"{before}{path}.js{after}"

count = 0
for target_dir in ['frontend/src', 'backend/src']:
    for root, dirs, files in os.walk(target_dir):
        for file in files:
            if file.endswith(('.ts', '.js')):
                if update_imports(os.path.join(root, file)):
                    count += 1

print(f"Updated {count} files.")
