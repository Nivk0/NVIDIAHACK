#!/bin/bash
# Create sample image files using ImageMagick or similar
# If ImageMagick is not available, we'll create placeholder text files that represent images

# Create a simple SVG image (works without ImageMagick)
cat > vacation-photo.jpg.txt << 'SVGEOF'
[Image File: vacation-photo.jpg]
Type: JPEG Image
Dimensions: 1920x1080
Size: 2.3 MB
Description: Family vacation photo from Grand Canyon trip
Date Taken: 2018-06-15
Location: Grand Canyon, Arizona
People: Family members
Quality: Good (slightly blurry)
SVGEOF

cat > meeting-whiteboard.jpg.txt << 'SVGEOF'
[Image File: meeting-whiteboard.jpg]
Type: JPEG Image  
Dimensions: 2048x1536
Size: 1.8 MB
Description: Photo of whiteboard from team meeting
Date Taken: 2024-01-15
Content: Project timeline and milestones
Quality: Clear
SVGEOF

cat > sunset-beach.jpg.txt << 'SVGEOF'
[Image File: sunset-beach.jpg]
Type: JPEG Image
Dimensions: 2560x1440
Size: 3.1 MB
Description: Beautiful sunset at the beach
Date Taken: 2023-08-20
Location: Malibu Beach, California
Quality: Excellent
SVGEOF

echo "Sample image descriptions created"
