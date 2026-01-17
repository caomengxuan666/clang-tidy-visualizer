#!/usr/bin/env python3
"""
Generate VS Code Extension Icon for Clang-Tidy Visualizer
"""

from PIL import Image, ImageDraw, ImageFont
import numpy as np
import os

# Create icons directory if it doesn't exist
os.makedirs('media/icons', exist_ok=True)

# Icon dimensions for VS Code extension
icon_sizes = [16, 32, 64, 128, 256]

# Color scheme
bg_color = (54, 162, 235)  # Blue background
txt_color = (255, 255, 255)  # White text and elements
accent_color = (255, 99, 132)  # Accent red for highlights

# Create a function to generate icons
def generate_icon(size):
    # Create a new image with transparent background
    image = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    
    # Draw background circle
    radius = size * 0.45
    draw.ellipse(
        [size * 0.05, size * 0.05, size * 0.95, size * 0.95],
        fill=bg_color
    )
    
    # Draw check mark (Clang-Tidy verification symbol)
    check_start = (size * 0.3, size * 0.5)
    check_mid = (size * 0.45, size * 0.65)
    check_end = (size * 0.7, size * 0.4)
    
    draw.line([check_start, check_mid, check_end],
              fill=txt_color, width=int(size * 0.12))
    
    # Draw code analysis elements (squares representing code lines)
    square_size = size * 0.08
    spacing = size * 0.03
    
    # First column
    draw.rectangle([
        size * 0.25 - square_size/2, size * 0.3 - square_size/2,
        size * 0.25 + square_size/2, size * 0.3 + square_size/2
    ], fill=txt_color, outline=None)
    
    # Second column
    draw.rectangle([
        size * 0.4 - square_size/2, size * 0.35 - square_size/2,
        size * 0.4 + square_size/2, size * 0.35 + square_size/2
    ], fill=txt_color, outline=None)
    
    # Third column
    draw.rectangle([
        size * 0.55 - square_size/2, size * 0.3 - square_size/2,
        size * 0.55 + square_size/2, size * 0.3 + square_size/2
    ], fill=txt_color, outline=None)
    
    # Fourth column
    draw.rectangle([
        size * 0.7 - square_size/2, size * 0.35 - square_size/2,
        size * 0.7 + square_size/2, size * 0.35 + square_size/2
    ], fill=txt_color, outline=None)
    
    # Add accent dot for visual interest
    accent_radius = size * 0.08
    draw.ellipse(
        [size * 0.8 - accent_radius, size * 0.7 - accent_radius,
         size * 0.8 + accent_radius, size * 0.7 + accent_radius],
        fill=accent_color
    )
    
    return image

# Generate all required sizes
for size in icon_sizes:
    icon = generate_icon(size)
    icon.save(f'media/icons/icon_{size}x{size}.png', 'PNG')
    print(f'Generated icon_{size}x{size}.png')

# Also generate SVG version using a simpler approach
# (SVG is better for scalability)
svg_content = f'''
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <!-- Background circle -->
  <circle cx="64" cy="64" r="60" fill="rgb{bg_color}"/>
  
  <!-- Check mark -->
  <path d="M40 64 L55 80 L88 48" 
        fill="none" 
        stroke="white" 
        stroke-width="12" 
        stroke-linecap="round" 
        stroke-linejoin="round"/>
  
  <!-- Code analysis elements -->
  <rect x="31" y="31" width="10" height="10" fill="white"/>
  <rect x="50" y="36" width="10" height="10" fill="white"/>
  <rect x="69" y="31" width="10" height="10" fill="white"/>
  <rect x="88" y="36" width="10" height="10" fill="white"/>
  
  <!-- Accent dot -->
  <circle cx="102" cy="89" r="10" fill="rgb{accent_color}"/>
</svg>
'''

# Save SVG file
with open('media/icons/icon.svg', 'w') as f:
    f.write(svg_content)

print('Generated icon.svg')

print('\nAll icons generated successfully!')
print('Icons saved in media/icons/ directory')