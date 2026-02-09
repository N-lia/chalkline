"""
Web-based Manim Documentation Tool
Fetches documentation from docs.manim.community instead of local source code.
"""

import httpx
from typing import Optional
import re

# Base URL for Manim Community documentation
MANIM_DOCS_BASE = "https://docs.manim.community/en/stable"


async def fetch_manim_class_docs(class_name: str) -> str:
    """
    Fetch documentation for a Manim class from the official docs website.
    
    Args:
        class_name: Name of the Manim class (e.g., 'Circle', 'Text', 'FadeIn')
    
    Returns:
        Formatted documentation string from the web
    """
    # Map common class categories to their module paths
    class_module_map = {
        # Geometry
        'Circle': 'reference/manim.mobject.geometry.arc.Circle',
        'Square': 'reference/manim.mobject.geometry.polygram.Square',
        'Rectangle': 'reference/manim.mobject.geometry.polygram.Rectangle',
        'Triangle': 'reference/manim.mobject.geometry.polygram.Triangle',
        'Line': 'reference/manim.mobject.geometry.line.Line',
        'Arrow': 'reference/manim.mobject.geometry.line.Arrow',
        'Dot': 'reference/manim.mobject.geometry.arc.Dot',
        'Polygon': 'reference/manim.mobject.geometry.polygram.Polygon',
        'Arc': 'reference/manim.mobject.geometry.arc.Arc',
        'Ellipse': 'reference/manim.mobject.geometry.arc.Ellipse',
        
        # Text
        'Text': 'reference/manim.mobject.text.text_mobject.Text',
        'MathTex': 'reference/manim.mobject.text.tex_mobject.MathTex',
        'Tex': 'reference/manim.mobject.text.tex_mobject.Tex',
        'Title': 'reference/manim.mobject.text.text_mobject.Title',
        'Paragraph': 'reference/manim.mobject.text.text_mobject.Paragraph',
        
        # Animations - Creation
        'Create': 'reference/manim.animation.creation.Create',
        'Write': 'reference/manim.animation.creation.Write',
        'DrawBorderThenFill': 'reference/manim.animation.creation.DrawBorderThenFill',
        'Uncreate': 'reference/manim.animation.creation.Uncreate',
        
        # Animations - Fade
        'FadeIn': 'reference/manim.animation.fading.FadeIn',
        'FadeOut': 'reference/manim.animation.fading.FadeOut',
        
        # Animations - Transform
        'Transform': 'reference/manim.animation.transform.Transform',
        'ReplacementTransform': 'reference/manim.animation.transform.ReplacementTransform',
        'MoveToTarget': 'reference/manim.animation.transform.MoveToTarget',
        'TransformMatchingShapes': 'reference/manim.animation.transform_matching_parts.TransformMatchingShapes',
        
        # Animations - Movement
        'MoveAlongPath': 'reference/manim.animation.movement.MoveAlongPath',
        'Rotate': 'reference/manim.animation.rotation.Rotate',
        
        # Animations - Indication
        'Indicate': 'reference/manim.animation.indication.Indicate',
        'Circumscribe': 'reference/manim.animation.indication.Circumscribe',
        'Flash': 'reference/manim.animation.indication.Flash',
        
        # Scene
        'Scene': 'reference/manim.scene.scene.Scene',
        'ThreeDScene': 'reference/manim.scene.three_d_scene.ThreeDScene',
        
        # Groups
        'VGroup': 'reference/manim.mobject.types.vectorized_mobject.VGroup',
        'Group': 'reference/manim.mobject.mobject.Group',
        
        # 3D
        'ThreeDAxes': 'reference/manim.mobject.three_d.three_dimensions.ThreeDAxes',
        'Sphere': 'reference/manim.mobject.three_d.three_dimensions.Sphere',
        'Cube': 'reference/manim.mobject.three_d.three_dimensions.Cube',
        
        # Axes and Graphs
        'Axes': 'reference/manim.mobject.graphing.coordinate_systems.Axes',
        'NumberPlane': 'reference/manim.mobject.graphing.coordinate_systems.NumberPlane',
        'NumberLine': 'reference/manim.mobject.graphing.number_line.NumberLine',
    }
    
    # Try to find the class in the map
    if class_name in class_module_map:
        doc_path = class_module_map[class_name]
    else:
        # Fallback: try common module patterns
        doc_path = None
    
    if doc_path:
        url = f"{MANIM_DOCS_BASE}/{doc_path}.html"
        
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(url)
                
                if response.status_code == 200:
                    # Parse the HTML and extract relevant content
                    html = response.text
                    return _parse_manim_doc_page(html, class_name)
                else:
                    return f"Could not fetch documentation for '{class_name}'. HTTP {response.status_code}"
        except httpx.TimeoutException:
            return f"Timeout while fetching documentation for '{class_name}'"
        except Exception as e:
            return f"Error fetching documentation: {str(e)}"
    
    # If not in map, try a web search approach
    return await search_manim_web(class_name)


def _parse_manim_doc_page(html: str, class_name: str) -> str:
    """
    Parse the HTML from a Manim docs page and extract useful information.
    """
    output = f"# {class_name} Documentation (from docs.manim.community)\n\n"
    
    # Extract the main description (first paragraph after class definition)
    desc_match = re.search(r'<dd[^>]*>\s*<p>([^<]+)</p>', html, re.DOTALL)
    if desc_match:
        description = desc_match.group(1).strip()
        description = re.sub(r'\s+', ' ', description)
        output += f"**Description:** {description}\n\n"
    
    # Extract parameters from the signature
    sig_match = re.search(r'class\s+' + class_name + r'\s*\(([^)]*)\)', html)
    if sig_match:
        params = sig_match.group(1)
        output += f"**Signature:** `{class_name}({params})`\n\n"
    
    # Extract parameter descriptions
    params_section = re.findall(
        r'<dt[^>]*>.*?<span class="sig-name descname">(\w+)</span>.*?</dt>\s*<dd[^>]*><p>([^<]+)</p>',
        html,
        re.DOTALL
    )
    if params_section:
        output += "**Parameters:**\n"
        for param_name, param_desc in params_section[:10]:
            clean_desc = re.sub(r'\s+', ' ', param_desc.strip())
            output += f"- `{param_name}`: {clean_desc}\n"
        output += "\n"
    
    # Extract example code if present
    example_match = re.search(r'<div class="highlight-python[^"]*"[^>]*><pre>([^<]+)</pre>', html, re.DOTALL)
    if example_match:
        example_code = example_match.group(1)
        # Clean up HTML entities
        example_code = (example_code
            .replace('&gt;', '>')
            .replace('&lt;', '<')
            .replace('&amp;', '&')
            .replace('&#39;', "'")
            .replace('&quot;', '"'))
        output += f"**Example:**\n```python\n{example_code}\n```\n"
    
    # Add link to full docs
    output += f"\n**Full documentation:** https://docs.manim.community/en/stable/reference/{class_name}.html\n"
    
    return output


async def search_manim_web(query: str) -> str:
    """
    Search the Manim documentation using a web request.
    
    Args:
        query: Search term (class name, method, or concept)
    
    Returns:
        Search results with links and brief descriptions
    """
    search_url = f"{MANIM_DOCS_BASE}/search.html"
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # The Manim docs use Sphinx search which requires JS
            # So we'll use a simpler approach - check the reference index
            response = await client.get(f"{MANIM_DOCS_BASE}/reference.html")
            
            if response.status_code == 200:
                html = response.text
                
                # Find all links containing the query
                pattern = rf'href="([^"]*{query}[^"]*)"[^>]*>([^<]*{query}[^<]*)<'
                matches = re.findall(pattern, html, re.IGNORECASE)
                
                if matches:
                    output = f"# Search Results for '{query}'\n\n"
                    seen = set()
                    for href, text in matches[:15]:
                        if text not in seen:
                            seen.add(text)
                            full_url = f"{MANIM_DOCS_BASE}/{href}" if not href.startswith('http') else href
                            output += f"- **{text}**: {full_url}\n"
                    return output
                else:
                    return f"No results found for '{query}' in Manim documentation."
            else:
                return f"Could not search documentation. HTTP {response.status_code}"
    except Exception as e:
        return f"Error searching documentation: {str(e)}"


# Synchronous wrapper tools for the agent
def query_manim_docs(class_name: str) -> str:
    """
    Tool function - gets Manim documentation from the web.
    
    Args:
        class_name: Name of Manim class to look up (e.g., 'Circle', 'FadeIn')
    
    Returns:
        Formatted documentation string from docs.manim.community
    """
    import asyncio
    
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    return loop.run_until_complete(fetch_manim_class_docs(class_name))


def search_manim_docs(keyword: str) -> str:
    """
    Search Manim documentation by keyword.
    
    Args:
        keyword: Search term (class name or concept)
    
    Returns:
        List of matching classes with links
    """
    import asyncio
    
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    return loop.run_until_complete(search_manim_web(keyword))


# Test it
if __name__ == "__main__":
    import asyncio
    
    async def test():
        print("=== Testing Circle ===")
        result = await fetch_manim_class_docs("Circle")
        print(result)
        
        print("\n=== Testing Search ===")
        result = await search_manim_web("transform")
        print(result)
    
    asyncio.run(test())