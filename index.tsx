import { GoogleGenAI, Type } from "@google/genai";
import React, { useState, useCallback, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";

// --- Custom Icons --- //
const GenerateIcon = () => (
    <svg className="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 .5a1.5 1.5 0 0 1 1.5 1.5v4.345l3.243 3.243a1.5 1.5 0 0 1-2.122 2.122L12 8.966l-2.621 2.62a1.5 1.5 0 0 1-2.122-2.121l3.243-3.243V2A1.5 1.5 0 0 1 12 .5ZM6.24 13.91a1.5 1.5 0 0 1-1.06-2.56l3.242-3.243a1.5 1.5 0 0 1 2.122 2.122L7.302 13.47a1.5 1.5 0 0 1-1.06.44Zm11.52 0a1.5 1.5 0 0 1-1.06-.44l-3.243-3.243a1.5 1.5 0 0 1 2.122-2.122l3.242 3.243a1.5 1.5 0 0 1-1.06 2.56ZM12 23.5a1.5 1.5 0 0 1-1.5-1.5v-4.345l-3.243-3.243a1.5 1.5 0 1 1 2.122-2.122L12 15.034l2.621-2.621a1.5 1.5 0 1 1 2.122 2.122l-3.243 3.243V22a1.5 1.5 0 0 1-1.5 1.5Z"/>
    </svg>
);

const ChevronDownIcon = () => (
    <svg className="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);


// --- Type Definitions --- //
interface SceneObject {
  shape: 'box' | 'sphere' | 'cylinder';
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
}

interface DesignResult {
  name: string;
  description: string;
  structure: SceneObject[];
}

interface AnalysisResult {
    stability: string;
    materials: string;
    energy: string;
}

type DesignTheme = 'futuristic' | 'haunted';

// --- Components --- //
const ThreeScene = ({ structure }: { structure: SceneObject[] }) => {
  return (
    <div className="canvas-container" role="img" aria-label="Interactive 3D model of the generated architectural design">
      <Canvas camera={{ position: [15, 15, 15], fov: 50 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 20, 5]} intensity={1.5} color="#ffffff" />
        <pointLight position={[-10, -5, -10]} intensity={1.2} color="#00ffff" />
        <Suspense fallback={null}>
          <Grid args={[100, 100]} infiniteGrid fadeDistance={50} fadeStrength={5} />
          <group>
            {structure.map((obj, index) => {
              let geometry;
              switch (obj.shape.toLowerCase()) {
                case 'sphere':
                  geometry = <sphereGeometry args={[1, 32, 32]} />;
                  break;
                case 'cylinder':
                  geometry = <cylinderGeometry args={[1, 1, 1, 32]} />;
                  break;
                case 'box':
                default:
                  geometry = <boxGeometry args={[1, 1, 1]} />;
                  break;
              }
              return (
                <mesh key={index} position={obj.position} scale={obj.scale}>
                  {geometry}
                  <meshStandardMaterial color={obj.color} metalness={0.2} roughness={0.5} />
                </mesh>
              );
            })}
          </group>
        </Suspense>
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      </Canvas>
    </div>
  );
};

const App = () => {
  const [prompt, setPrompt] = useState('');
  const [theme, setTheme] = useState<DesignTheme>('futuristic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DesignResult | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const generateDesign = useCallback(async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setAnalysisResult(null);
    setAnalysisError(null);

    const futuristicInstruction = "You are an AI specializing in futuristic and impossible architecture for the 'DreamStruct' application. Translate natural language descriptions ('vibe coding') into a 3D model of an innovative, physics-defying structure. The designs should incorporate advanced materials, clean lines, and a sense of technological marvel. Your response MUST be a valid JSON object adhering to the schema. Do not include any text outside the JSON object, including markdown tags like ```json.";
    const hauntedInstruction = "You are an AI specializing in haunted and supernatural architecture for the 'DreamStruct' application. Translate natural language descriptions ('vibe coding') into a 3D model of a gothic, eerie, or impossible structure. The designs must ignore conventional physics and evoke a sense of dread, mystery, or supernatural wonder. Your response MUST be a valid JSON object adhering to the schema. Do not include any text outside the JSON object, including markdown tags like ```json.";

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: {
          systemInstruction: theme === 'futuristic' ? futuristicInstruction : hauntedInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "A creative name for the architectural design, fitting the selected theme." },
              description: { type: Type.STRING, description: "A detailed paragraph describing the concept, its history, and aesthetic, fitting the selected theme." },
              structure: {
                type: Type.ARRAY,
                description: "An array of 3D primitive objects composing the building.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    shape: { type: Type.STRING, description: "Geometric shape ('box', 'sphere', 'cylinder')." },
                    position: { type: Type.ARRAY, description: "[x, y, z] coordinates.", items: { type: Type.NUMBER } },
                    scale: { type: Type.ARRAY, description: "[x, y, z] scaling factors.", items: { type: Type.NUMBER } },
                    color: { type: Type.STRING, description: "Hex color code (e.g., '#00ffff' for cyan)." }
                  },
                  required: ["shape", "position", "scale", "color"]
                }
              }
            },
            required: ["name", "description", "structure"]
          },
        },
      });

      const jsonString = response.text.trim();
      const design = JSON.parse(jsonString);
      setResult(design);

    } catch (e) {
      console.error(e);
      setError("Failed to generate design. The model may have returned an unexpected format. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [prompt, theme]);
  
  const analyzeFeasibility = useCallback(async () => {
    if (!result) return;
    
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    const analysisInstruction = "You are an AI expert in futuristic structural engineering and sustainable design. Analyze the provided architectural concept. Based on its name and description, provide a feasibility analysis. Your response must be a valid JSON object. Do not include markdown tags. Be creative and scientific, suggesting theoretical materials or energy sources where appropriate to make the impossible, possible.";
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const analysisPrompt = `Analyze the following design concept:\nName: ${result.name}\nDescription: ${result.description}`;
      
      const response = await ai.models.generateContent({
          model: "gemini-2.5-pro",
          contents: analysisPrompt,
          config: {
              systemInstruction: analysisInstruction,
              responseMimeType: "application/json",
              responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                      stability: { type: Type.STRING, description: "Analysis of structural stability. Suggest innovative, futuristic solutions (e.g., gravity anchors, force fields, smart materials) to support impossible elements." },
                      materials: { type: Type.STRING, description: "Suggestions for material efficiency. Propose advanced or theoretical materials (e.g., carbon nanofoam, programmable matter, bio-luminescent alloys) that fit the theme." },
                      energy: { type: Type.STRING, description: "Ideas for energy usage and sustainability. Suggest novel energy sources (e.g., zero-point energy, solar sails, kinetic capture from the structure's movement)." }
                  },
                  required: ["stability", "materials", "energy"]
              }
          }
      });
      
      const jsonString = response.text.trim();
      const analysis = JSON.parse(jsonString);
      setAnalysisResult(analysis);

    } catch (e) {
      console.error(e);
      setAnalysisError("Failed to analyze the design. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [result]);
  
  const launchSimulation = () => {
    alert("WebXR Simulation feature is coming soon! Imagine walking through your creation in augmented reality.");
  };

  const placeholderText = theme === 'futuristic'
    ? "Describe your futuristic design... e.g., 'A skyscraper made of liquid metal that reshapes with the wind, with drone landing pads.'"
    : "Describe your haunted design... e.g., 'A gothic cathedral with floating buttresses and a bell tower made of swirling shadow.'";

  return (
    <>
      <header className="header">
        <h1>DreamStruct</h1>
        <p>Design Beyond Imagination.</p>
      </header>
      
      <main>
        <div className="editor-form">
          <div className="theme-selector">
            <label htmlFor="theme-select">Design Theme</label>
            <div className="select-wrapper">
              <select id="theme-select" value={theme} onChange={(e) => setTheme(e.target.value as DesignTheme)}>
                  <option value="futuristic">Futuristic</option>
                  <option value="haunted">Haunted</option>
              </select>
              <ChevronDownIcon />
            </div>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholderText}
            aria-label="Architectural design description"
            disabled={loading}
          />
          <button onClick={generateDesign} disabled={loading || !prompt.trim()}>
            {loading ? 'Generating...' : 'Generate Design'}
            {!loading && <GenerateIcon />}
          </button>
        </div>

        {loading && (
          <div className="loading-container" aria-live="polite">
            <div className="futuristic-loader">
                <div></div>
                <div></div>
                <div></div>
            </div>
            <span>Generating architectural marvel...</span>
          </div>
        )}

        {error && !loading && (
            <div className="error-container" role="alert">
                <p><strong>Error:</strong> {error}</p>
            </div>
        )}

        {result && (
          <div className="result-container">
            <h2 id="design-name">{result.name}</h2>
            <p aria-labelledby="design-name">{result.description}</p>
            <ThreeScene structure={result.structure} />
            
            <div className="analyzer-section">
                {!analysisResult && (
                    <button onClick={analyzeFeasibility} disabled={isAnalyzing} className="analyze-button">
                        {isAnalyzing ? 'Analyzing...' : 'Analyze Feasibility'}
                    </button>
                )}

                {isAnalyzing && (
                     <div className="loading-container">
                        <div className="futuristic-loader"></div>
                        <span>Running feasibility analysis...</span>
                    </div>
                )}
                
                {analysisError && !isAnalyzing && (
                    <div className="error-container" role="alert">
                        <p><strong>Analysis Error:</strong> {analysisError}</p>
                    </div>
                )}

                {analysisResult && (
                    <div className="analysis-results">
                        <div className="analysis-category">
                            <h3>Structural Stability</h3>
                            <p>{analysisResult.stability}</p>
                        </div>
                         <div className="analysis-category">
                            <h3>Material Efficiency</h3>
                            <p>{analysisResult.materials}</p>
                        </div>
                         <div className="analysis-category">
                            <h3>Energy Usage</h3>
                            <p>{analysisResult.energy}</p>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="simulation-section">
                <button onClick={launchSimulation} className="simulation-button">
                    Launch AR/3D Simulation
                </button>
            </div>

          </div>
        )}
      </main>
    </>
  );
};

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(<App />);