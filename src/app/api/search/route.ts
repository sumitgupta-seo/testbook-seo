cat > ~/Downloads/testbook - seo / src / app / api / search / route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const query = request.nextUrl.searchParams.get('q');
    const API_KEY = 'AIzaSyB7u3LnDGnE76bi9BNVKSsGCDHDI1V5Ofk';
    const CX = 'b4005e20aeda84592';
    const url = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${CX}&q=${encodeURIComponent(query!)}&num=10`;
    const res = await fetch(url);
    const data = await res.json();
    return NextResponse.json(data);
}
EOF