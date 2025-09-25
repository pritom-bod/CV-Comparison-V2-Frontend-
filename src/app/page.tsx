"use client";

import { useState, useEffect } from "react";
import { Upload, FileText, AlertCircle, ChevronRight, Menu, X, Download } from "lucide-react";
import { saveAs } from "file-saver";
import { ArrowUp } from "lucide-react";

interface Scores {
  general_qualifications: {
    education: number;
    years_of_experience: number;
    total: number;
  };
  adequacy_for_assignment: {
    relevant_project_experience: number;
    donor_experience: number;
    regional_experience: number;
    total: number;
  };
  specific_skills_competencies: {
    technical_skills: number;
    language_proficiency: number;
    certifications: number;
    total: number;
  };
  total_score: number;
}

interface DetailedEvaluation {
  criterion: string;
  weight: number;
  score: number;
  justification: string;
}

interface Candidate {
  candidate_name: string;
  recommendation: string;
  scores: Scores;
  summary_justification: {
    key_strengths: string;
    key_weaknesses: string;
  };
  detailed_evaluation: DetailedEvaluation[];
}

interface ComparisonMatrix {
  candidate_name: string;
  total_score: number;
  rank: number;
}

interface WhyNotOther {
  candidate_name: string;
  reason: string;
}

interface FinalRecommendation {
  best_candidate: string;
  final_decision: string;
  justification: string | {
    detailed_explanation: string;
    why_he: string;
    why_not_others: WhyNotOther[];
  };
}

interface JsonData {
  tor_text: string;
  criteria: { criterion: string; weight: number }[];
  candidates: Candidate[];
  comparison_matrix: ComparisonMatrix[];
  final_recommendation: FinalRecommendation;
}

export default function Page() {
  
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/compare-cvs/";
  const [tor, setTor] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<JsonData | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal state
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
  const toggleVisibility = () => {
    if (window.pageYOffset > 100) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };
  window.addEventListener("scroll", toggleVisibility);
  return () => window.removeEventListener("scroll", toggleVisibility);
}, []);

const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setData(null);

    
    if (!tor) {
      setError("Please enter the Terms of Reference (ToR).");
      return;
    }
    if (files.length === 0) {
      setError("Please upload at least one CV file.");
      return;
    }
    if (files.length > 10) {
      setError("Maximum 10 CVs allowed.");
      return;
    }

    const formData = new FormData();
    formData.append("tor", tor);
    files.forEach((file) => formData.append("cvs", file));

    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to process CVs.");
      }
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles].slice(0, 10));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFileChange(Array.from(e.dataTransfer.files));
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getBadgeColor = (recommendation: string) => {
    if (recommendation === "Highly Suitable") return "bg-green-100 text-green-800 border-green-300";
    if (recommendation === "Suitable") return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-red-100 text-red-800 border-red-300";
  };

  const mapCriteria = () => {
    if (!data?.criteria) return [];
    return [
      {
        category: "General Qualifications",
        weight: "20%",
        subitems: [
          { name: "Education", weight: data.criteria.find(c => c.criterion === "Education")?.weight || 10 },
          { name: "Years of Experience", weight: data.criteria.find(c => c.criterion === "Years of Experience")?.weight || 10 },
        ],
      },
      {
        category: "Adequacy for the Assignment",
        weight: "50%",
        subitems: [
          { name: "Relevant Project Experience", weight: data.criteria.find(c => c.criterion === "Relevant Project Experience")?.weight || 25 },
          { name: "Donor Experience (WB, ADB, etc.)", weight: data.criteria.find(c => c.criterion === "Donor Experience (WB, ADB, etc.)")?.weight || 15 },
          { name: "Regional Experience", weight: data.criteria.find(c => c.criterion === "Regional Experience")?.weight || 10 },
        ],
      },
      {
        category: "Specific Skills & Competencies",
        weight: "30%",
        subitems: [
          { name: "Technical Skills", weight: data.criteria.find(c => c.criterion === "Technical Skills")?.weight || 15 },
          { name: "Language Proficiency", weight: data.criteria.find(c => c.criterion === "Language Proficiency")?.weight || 10 },
          { name: "Certifications", weight: data.criteria.find(c => c.criterion === "Certifications")?.weight || 5 },
        ],
      },
    ];
  };

  const sortedMatrix = data?.comparison_matrix ? [...data.comparison_matrix].sort((a, b) => a.rank - b.rank) : [];

  const allCriteria = data?.criteria.map(c => c.criterion) || [];

  const getFulfillmentForCandidate = (candidate: Candidate) => {
    const fulfillmentMap: { [key: string]: string } = {};
    allCriteria.forEach(crit => {
      const evalItem = candidate.detailed_evaluation.find(de => de.criterion === crit);
      if (evalItem && evalItem.score > 0 && evalItem.justification && evalItem.justification !== "No evidence in CV.") {
        fulfillmentMap[crit] = evalItem.justification;
      } else {
        fulfillmentMap[crit] = "No work here";
      }
    });
    return fulfillmentMap;
  };

  const generateDocxReport = async (reportData: JsonData) => {
    const { Document, Packer, Paragraph, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } = await import('docx');

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: "CV Comparison Report",
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              text: "Terms of Reference",
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
              text: reportData.tor_text || "No ToR text provided.",
            }),
            new Paragraph({
              text: "Evaluation Criteria",
              heading: HeadingLevel.HEADING_1,
            }),
            ...mapCriteria().flatMap(category => [
              new Paragraph({
                text: `${category.category} - ${category.weight}`,
                heading: HeadingLevel.HEADING_2,
              }),
              ...category.subitems.map(subitem => 
                new Paragraph({
                  text: `${subitem.name}: ${subitem.weight}%`,
                  bullet: { level: 0 },
                })
              ),
            ]),
            new Paragraph({
              text: "Candidates",
              heading: HeadingLevel.HEADING_1,
            }),
            ...reportData.candidates.flatMap(candidate => [
              new Paragraph({
                text: candidate.candidate_name || "Unnamed Candidate",
                heading: HeadingLevel.HEADING_2,
              }),
              new Paragraph({
                text: `Recommendation: ${candidate.recommendation || "Not Evaluated"}`,
              }),
              new Paragraph({
                text: `Total Score: ${candidate.scores?.total_score?.toFixed(2) || "N/A"}`,
              }),
              new Paragraph({
                text: `Strengths: ${candidate.summary_justification?.key_strengths || "None provided."}`,
              }),
              new Paragraph({
                text: `Weaknesses: ${candidate.summary_justification?.key_weaknesses || "None provided."}`,
              }),
              new Paragraph({
                text: "Scores",
                heading: HeadingLevel.HEADING_3,
              }),
              new Paragraph({
                text: "General Qualifications",
                bullet: { level: 0 },
              }),
              new Paragraph({
                text: `Education: ${candidate.scores?.general_qualifications?.education?.toFixed(2) || "N/A"}`,
                bullet: { level: 1 },
              }),
              new Paragraph({
                text: `Years of Experience: ${candidate.scores?.general_qualifications?.years_of_experience?.toFixed(2) || "N/A"}`,
                bullet: { level: 1 },
              }),
              new Paragraph({
                text: "Adequacy for the Assignment",
                bullet: { level: 0 },
              }),
              new Paragraph({
                text: `Relevant Project Experience: ${candidate.scores?.adequacy_for_assignment?.relevant_project_experience?.toFixed(2) || "N/A"}`,
                bullet: { level: 1 },
              }),
              new Paragraph({
                text: `Donor Experience: ${candidate.scores?.adequacy_for_assignment?.donor_experience?.toFixed(2) || "N/A"}`,
                bullet: { level: 1 },
              }),
              new Paragraph({
                text: `Regional Experience: ${candidate.scores?.adequacy_for_assignment?.regional_experience?.toFixed(2) || "N/A"}`,
                bullet: { level: 1 },
              }),
              new Paragraph({
                text: "Specific Skills & Competencies",
                bullet: { level: 0 },
              }),
              new Paragraph({
                text: `Technical Skills: ${candidate.scores?.specific_skills_competencies?.technical_skills?.toFixed(2) || "N/A"}`,
                bullet: { level: 1 },
              }),
              new Paragraph({
                text: `Language Proficiency: ${candidate.scores?.specific_skills_competencies?.language_proficiency?.toFixed(2) || "N/A"}`,
                bullet: { level: 1 },
              }),
              new Paragraph({
                text: `Certifications: ${candidate.scores?.specific_skills_competencies?.certifications?.toFixed(2) || "N/A"}`,
                bullet: { level: 1 },
              }),
              new Paragraph({
                text: "Detailed Evaluation",
                heading: HeadingLevel.HEADING_3,
              }),
              ...candidate.detailed_evaluation.map(evalItem => 
                new Paragraph({
                  text: `${evalItem.criterion}: Score ${evalItem.score?.toFixed(2) || "N/A"} (Weight: ${evalItem.weight}%) - Justification: ${evalItem.justification || "None provided."}`,
                  bullet: { level: 0 },
                })
              ),
            ]),
            new Paragraph({
              text: "Comparison Ranking",
              heading: HeadingLevel.HEADING_1,
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1 },
                bottom: { style: BorderStyle.SINGLE, size: 1 },
                left: { style: BorderStyle.SINGLE, size: 1 },
                right: { style: BorderStyle.SINGLE, size: 1 },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
                insideVertical: { style: BorderStyle.SINGLE, size: 1 },
              },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph("Candidate Name")] }),
                    new TableCell({ children: [new Paragraph("Total Score")] }),
                    new TableCell({ children: [new Paragraph("Rank")] }),
                  ],
                }),
                ...sortedMatrix.map(m => 
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph(m.candidate_name || "Unnamed Candidate")] }),
                      new TableCell({ children: [new Paragraph(m.total_score?.toFixed(2) || "N/A")] }),
                      new TableCell({ children: [new Paragraph(m.rank?.toString() || "N/A")] }),
                    ],
                  })
                ),
              ],
            }),
            new Paragraph({
              text: "Final Recommendation",
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
              text: `Best Candidate: ${reportData.final_recommendation?.best_candidate || "None"}`,
            }),
            new Paragraph({
              text: `Decision: ${reportData.final_recommendation?.final_decision || "Not Evaluated"}`,
            }),
            ...(typeof reportData.final_recommendation?.justification === "string"
              ? [
                  new Paragraph({
                    text: "Justification",
                    heading: HeadingLevel.HEADING_2,
                  }),
                  new Paragraph({
                    text: reportData.final_recommendation.justification || "No justification provided.",
                  }),
                ]
              : [
                  new Paragraph({
                    text: "Detailed Explanation",
                    heading: HeadingLevel.HEADING_2,
                  }),
                  new Paragraph({
                    text: reportData.final_recommendation?.justification?.detailed_explanation || "No detailed explanation provided.",
                  }),
                  new Paragraph({
                    text: "Why Recommended Candidate",
                    heading: HeadingLevel.HEADING_2,
                  }),
                  new Paragraph({
                    text: reportData.final_recommendation?.justification?.why_he || "No reason provided for recommended candidate.",
                  }),
                  new Paragraph({
                    text: "Why Not Other Candidates",
                    heading: HeadingLevel.HEADING_2,
                  }),
                  ...(reportData.final_recommendation?.justification?.why_not_others || []).map(other => [
                    new Paragraph({
                      text: `Candidate: ${other.candidate_name || "Unnamed Candidate"}`,
                      bullet: { level: 0 },
                    }),
                    new Paragraph({
                      text: `Reason: ${other.reason || "No reason provided."}`,
                      bullet: { level: 1 },
                    }),
                  ]).flat(),
                ]
            ),
            new Paragraph({
              text: "CV Comparison Table",
              heading: HeadingLevel.HEADING_1,
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1 },
                bottom: { style: BorderStyle.SINGLE, size: 1 },
                left: { style: BorderStyle.SINGLE, size: 1 },
                right: { style: BorderStyle.SINGLE, size: 1 },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
                insideVertical: { style: BorderStyle.SINGLE, size: 1 },
              },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph("Candidate Name")] }),
                    ...allCriteria.map(crit => new TableCell({ children: [new Paragraph(crit)] })),
                  ],
                }),
                ...reportData.candidates.map(candidate => {
                  const fulfillment = getFulfillmentForCandidate(candidate);
                  return new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph(candidate.candidate_name || "Unnamed Candidate")] }),
                      ...allCriteria.map(crit => new TableCell({ children: [new Paragraph(fulfillment[crit] || "N/A")] })),
                    ],
                  });
                }),
              ],
            }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, "cv_comparison_report.docx");
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 bg-white shadow-md z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="logo-container flex-shrink-0">
                <img
                  src="/max.png"
                  alt="Max Company Logo"
                  className="h-6 sm:h-6 md:h-7 w-auto"
                />
              </div>
              <h1 className="text-xl item-center sm:text-2xl font-bold text-blue-900 dark:text-blue-800 flex items-center">CV
             <span className="text-red-700 color dark:text-red-800"> Comparison </span>
             <span className="text-red-700 dark:text-red-800"> Tool</span></h1>
            </div>
          </div>
        </div>
      </nav>
      {/* Main Content */}
      <div className="container mx-auto pt-20 pb-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        

        {/* Job Description Section */}
        <div className="job-description-card">
          <div className="card-header">
            <h2>Job Description (ToR)</h2>
            <button
              className="view-full-btn"
              type="button"
              onClick={() => {
                if (!tor.trim() && !isModalOpen) {
                  alert("Please paste the Terms of Reference first.");
                  return;
                }
                setIsModalOpen(!isModalOpen);
              }}
            >
              {isModalOpen ? "- View Full ToR" : "+ View Full ToR"}
            </button>
          </div>

          {/* Textarea for ToR Input */}
          <div className="mt-4">
            <textarea
              value={tor}
              onChange={(e) => setTor(e.target.value)}
              rows={6}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              placeholder="Paste the detailed Terms of Reference here..."
            />
            <p className="mt-1 text-sm text-gray-500">
              Paste the full job requirements or Terms of Reference.
            </p>
          </div>

          {/* Modal for Full ToR */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md mx-auto shadow-lg">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Full Terms of Reference</h2>
                  <button
                    className="text-gray-500 hover:text-gray-700"
                    onClick={() => setIsModalOpen(false)}
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <p className="text-gray-700 whitespace-pre-wrap">{tor || "No ToR entered yet."}</p>
                </div>
                <button
                  className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                  onClick={() => setIsModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* File Upload Section */}
        <div className="file-upload-card">
          <h2>File Upload</h2>
          
          <div
            className={`dropzone-area ${isDragging ? "dragging" : ""}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="dropzone-icon">
              <Upload size={24} />
            </div>
            <div className="dropzone-text">
              <p>Drag & Drop upto 10 CVs here or click to browse</p>
            </div>
            
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt"
              onChange={(e) => {
                if (e.target.files) {
                  handleFileChange(Array.from(e.target.files));
                }
              }}
              className="file-input-hidden"
            />
          </div>

          {/* Show uploaded files */}
          {files.length > 0 && (
            <div className="uploaded-files">
              {files.map((file, index) => (
                <div key={index} className="file-item">
                  <div className="file-icon">
                    <div className="file-avatar"></div>
                  </div>
                  <span className="file-name">{file.name}</span>
                  <button 
                    onClick={() => removeFile(index)}
                    className="remove-btn"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="file-info">
            {files.length}/10 files uploaded. Supported formats: PDF, DOC, DOCX
          </p>

          {/* Analyze Button */}
          <button 
            className="analyze-btn-custom"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Analyzing...' : 'Analyze CVs'}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message flex items-center gap-2 mt-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700" role="alert">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* Improved Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 shadow-lg flex items-center space-x-4">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-lg font-medium text-gray-800">Processing...</p>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      
      {data && (
        <div className="space-y-10 mt-10">
          <div className="button-container">
            <button
              onClick={() => generateDocxReport(data)}
              className="download-button"
            >
              <Download size={22} />
              Download Report (DOCX)
            </button>
          </div>

          {/* ToR */}
          <section className="section bg-white shadow-md rounded-lg p-4">
            <h2 className="section-header flex items-center gap-2 text-xl font-semibold text-gray-900">
              <span className="section-icon text-blue-600">📑</span>
              Terms of Reference
            </h2>
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md text-gray-800">
              {data.tor_text || "No ToR text provided."}
            </div>
          </section>

          {/* Evaluation Criteria */}
          <section className="section bg-white shadow-md rounded-lg p-4">
            <h2 className="section-header flex items-center gap-2 text-xl font-semibold text-gray-900">
              <span className="section-icon text-blue-600">📌</span>
              Evaluation Criteria
            </h2>
            <details className="criteria-section mt-4">
              <summary className="cursor-pointer text-blue-600 font-medium hover:text-blue-800 transition">
                Show Evaluation Criteria
              </summary>
              <div className="scores-hierarchy mt-4 space-y-4">
                {mapCriteria().map((category, idx) => (
                  <div key={idx} className="scores-category">
                    <div className="scores-category-header flex items-center gap-2 text-md font-semibold text-gray-800">
                      <ChevronRight size={16} className="text-blue-500" />
                      {category.category} - {category.weight}
                    </div>
                    {category.subitems.map((subitem, subIdx) => (
                      <div
                        key={subIdx}
                        className="scores-subitem flex justify-between text-gray-700 mt-2 text-sm"
                      >
                        <span>{subitem.name}</span>
                        <span>{subitem.weight}%</span>
                      </div>
                    ))}
                  </div>
                ))}
                <div className="scores-category">
                  <div className="scores-category-header flex items-center gap-2 text-md font-semibold text-gray-800">
                    <ChevronRight size={16} className="text-blue-500" />
                    Total Score - 100%
                  </div>
                </div>
              </div>
            </details>
          </section>

          {/* Candidates */}
          <section className="section bg-white shadow-md rounded-lg p-4">
            <h2 className="section-header flex items-center gap-2 text-xl font-semibold text-gray-900">
              <span className="section-icon text-blue-600">👤</span>
              Candidates
            </h2>
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              {(data.candidates || []).map((c, idx) => (
                <div
                  key={idx}
                  className="candidate-card bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-lg transition"
                >
                  <div className="candidate-header flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {c.candidate_name || "Unnamed Candidate"}
                    </h3>
                    <span
                      className={`candidate-badge inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getBadgeColor(
                        c.recommendation || "Not Evaluated"
                      )}`}
                    >
                      {c.recommendation || "Not Evaluated"}
                    </span>
                  </div>
                  <div className="space-y-2 mt-3">
                    <p className="strengths text-gray-700 text-sm">
                      <strong>Strengths:</strong>{" "}
                      {c.summary_justification?.key_strengths || "None provided."}
                    </p>
                    <p className="weaknesses text-gray-700 text-sm">
                      <strong>Weaknesses:</strong>{" "}
                      {c.summary_justification?.key_weaknesses || "None provided."}
                    </p>
                  </div>
                  <div className="scores-hierarchy mt-3 space-y-3">
                    <div className="scores-category">
                      <div className="scores-category-header flex items-center gap-2 text-md font-semibold text-gray-800">
                        <ChevronRight size={16} className="text-blue-500" />
                        General Qualifications - 20%
                      </div>
                      <div className="scores-subitem flex justify-between text-gray-700 mt-1 text-sm">
                        <span>Education</span>
                        <span>
                          {c.scores?.general_qualifications?.education != null
                            ? c.scores.general_qualifications.education.toFixed(2)
                            : "N/A"}
                        </span>
                      </div>
                      <div className="scores-subitem flex justify-between text-gray-700 mt-1 text-sm">
                        <span>Years of Experience</span>
                        <span>
                          {c.scores?.general_qualifications?.years_of_experience != null
                            ? c.scores.general_qualifications.years_of_experience.toFixed(2)
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                    <div className="scores-category">
                      <div className="scores-category-header flex items-center gap-2 text-md font-semibold text-gray-800">
                        <ChevronRight size={16} className="text-blue-500" />
                        Adequacy for the Assignment - 50%
                      </div>
                      <div className="scores-subitem flex justify-between text-gray-700 mt-1 text-sm">
                        <span>Relevant Project Experience</span>
                        <span>
                          {c.scores?.adequacy_for_assignment?.relevant_project_experience != null
                            ? c.scores.adequacy_for_assignment.relevant_project_experience.toFixed(2)
                            : "N/A"}
                        </span>
                      </div>
                      <div className="scores-subitem flex justify-between text-gray-700 mt-1 text-sm">
                        <span>Donor Experience (WB, ADB, etc.)</span>
                        <span>
                          {c.scores?.adequacy_for_assignment?.donor_experience != null
                            ? c.scores.adequacy_for_assignment.donor_experience.toFixed(2)
                            : "N/A"}
                        </span>
                      </div>
                      <div className="scores-subitem flex justify-between text-gray-700 mt-1 text-sm">
                        <span>Regional Experience</span>
                        <span>
                          {c.scores?.adequacy_for_assignment?.regional_experience != null
                            ? c.scores.adequacy_for_assignment.regional_experience.toFixed(2)
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                    <div className="scores-category">
                      <div className="scores-category-header flex items-center gap-2 text-md font-semibold text-gray-800">
                        <ChevronRight size={16} className="text-blue-500" />
                        Specific Skills & Competencies - 30%
                      </div>
                      <div className="scores-subitem flex justify-between text-gray-700 mt-1 text-sm">
                        <span>Technical Skills</span>
                        <span>
                          {c.scores?.specific_skills_competencies?.technical_skills != null
                            ? c.scores.specific_skills_competencies.technical_skills.toFixed(2)
                            : "N/A"}
                        </span>
                      </div>
                      <div className="scores-subitem flex justify-between text-gray-700 mt-1 text-sm">
                        <span>Language Proficiency</span>
                        <span>
                          {c.scores?.specific_skills_competencies?.language_proficiency != null
                            ? c.scores.specific_skills_competencies.language_proficiency.toFixed(2)
                            : "N/A"}
                        </span>
                      </div>
                      <div className="scores-subitem flex justify-between text-gray-700 mt-1 text-sm">
                        <span>Certification</span>
                        <span>
                          {c.scores?.specific_skills_competencies?.certifications != null
                            ? c.scores.specific_skills_competencies.certifications.toFixed(2)
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                    
                        { <div className="scores-category-header flex items-center gap-2 text-lg font-semibold text-gray-800">
                          <ChevronRight size={18} className="text-blue-500" />
                          Total Score - 100%
                        </div>}
                        {<div className="scores-subitem flex justify-between text-gray-700 mt-2">
                          <span>Total</span>
                          <span>
                            {c.scores?.total_score != null
                              ? c.scores.total_score.toFixed(2)
                              : "N/A"}
                          </span>
                          
                          </div>}
                          {<div className="scores-subitem flex justify-between text-gray-700 mt-2">
                          <span>  </span>
                          <span className="text-xs italic text-">
                            (This score is approximate and can fluctuate by plus or minus 5)
                          </span>
                          
                          </div>}
                  </div>
                  <details className="details-section mt-4">
                    <summary className="cursor-pointer text-blue-600 font-medium hover:text-blue-800 transition">
                      Show Detailed Evaluation
                    </summary>
                    <div className="space-y-3 mt-3">
                      <h4 className="font-semibold text-gray-800 text-md">
                        Detailed Evaluations
                      </h4>
                      {(c.detailed_evaluation || []).map((d, j) => (
                        <div
                          key={j}
                          className="evaluation-item p-3 text-sm"
                        >
                          <p className="text-gray-700">
                            <strong>Criterion:</strong> {d.criterion || "N/A"}
                          </p>
                          <p className="text-gray-700">
                            <strong>Weight:</strong> {d.weight != null ? `${d.weight}%` : "N/A"} |{" "}
                            <strong>Score:</strong> {d.score != null ? d.score.toFixed(2) : "N/A"}
                          </p>
                          <p className="text-gray-700">
                            <strong>Justification:</strong> {d.justification || "None provided."}
                          </p>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              ))}
            </div>
          </section>

          {/* Comparison Ranking */}
          <section className="section bg-white shadow-md rounded-lg p-4">
            <h2 className="section-header flex items-center gap-2 text-xl font-semibold text-gray-900">
              <span className="section-icon text-blue-600">📋</span>
              Comparison Ranking
            </h2>
            <div className="table-container mt-4 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-blue-50">
                    <th className="p-2 text-left text-gray-800 font-semibold border-b border-gray-200 text-sm">
                      Name
                    </th>
                    <th className="p-2 text-left text-gray-800 font-semibold border-b border-gray-200 text-sm">
                      Rank
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMatrix.map((m, i) => (
                    <tr
                      key={i}
                      className="hover:bg-gray-50 transition"
                    >
                      <td className="p-2 text-gray-700 border-b border-gray-200 text-sm">
                        {m.candidate_name || "Unnamed Candidate"}
                      </td>
                      <td className="p-2 text-gray-700 border-b border-gray-200 text-sm">
                        {m.rank != null ? m.rank : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Final Recommendation */}
          <section className="section bg-white shadow-md rounded-lg p-4">
            <h2 className="section-header flex items-center gap-2 text-xl font-semibold text-gray-900">
              <span className="section-icon text-blue-600">🏆</span>
              Final Recommendation
            </h2>
            <div className="recommendation-container mt-4 space-y-3">
              <p className="font-semibold text-md text-gray-900">
                Best Candidate: {data.final_recommendation?.best_candidate || "None"}
              </p>
              <p className="font-semibold text-md text-gray-900">
                Decision: {data.final_recommendation?.final_decision || "Not Evaluated"}
              </p>
              <div className="scores-hierarchy space-y-3 text-sm">
                {typeof data.final_recommendation?.justification === "string" ? (
                  <div className="scores-category">
                    <div className="scores-category-header flex items-center gap-2 text-md font-semibold text-gray-800">
                      <ChevronRight size={16} className="text-blue-500" />
                      Justification
                    </div>
                    <div className="scores-subitem text-gray-700 mt-1">
                      <p>{data.final_recommendation.justification || "No justification provided."}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="scores-category">
                      <div className="scores-category-header flex items-center gap-2 text-md font-semibold text-gray-800">
                        <ChevronRight size={16} className="text-blue-500" />
                        Detailed Explanation
                      </div>
                      <div className="scores-subitem text-gray-700 mt-1">
                        <p>{data.final_recommendation?.justification?.detailed_explanation || "No detailed explanation provided."}</p>
                      </div>
                    </div>
                    <div className="scores-category">
                      <div className="scores-category-header flex items-center gap-2 text-md font-semibold text-gray-800">
                        <ChevronRight size={16} className="text-blue-500" />
                        Why Recommended Candidate
                      </div>
                      <div className="scores-subitem text-gray-700 mt-1">
                        <p>{data.final_recommendation?.justification?.why_he || "No reason provided for recommended candidate."}</p>
                      </div>
                    </div>
                    <div className="scores-category">
                      <div className="scores-category-header flex items-center gap-2 text-md font-semibold text-gray-800">
                        <ChevronRight size={16} className="text-blue-500" />
                        Why Not Other Candidates
                      </div>
                      <div className="scores-subitem mt-1">
                        {(data.final_recommendation?.justification?.why_not_others || []).map((other, index) => (
                          <div key={index} className="text-gray-700 mb-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                            <p><strong>Candidate:</strong> {other.candidate_name || "Unnamed Candidate"}</p>
                            <p><strong>Reason:</strong> {other.reason || "No reason provided."}</p>
                          </div>
                        ))}
                        {(!data.final_recommendation?.justification?.why_not_others ||
                          data.final_recommendation.justification.why_not_others.length === 0) && (
                          <p className="text-gray-700">No other candidates evaluated.</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* CV Comparison Table */}
          <section className="section bg-white shadow-md rounded-lg p-4">
            <h2 className="section-header flex items-center gap-2 text-xl font-semibold text-gray-900">
              <span className="section-icon text-blue-600">📊</span>
              CV Comparison Table
            </h2>
            <div className="table-container mt-4 overflow-x-auto">
              <table className="w-full border-collapse bg-white shadow-sm rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    <th className="p-2 text-left font-semibold border-b border-blue-700 text-sm">Candidate Name</th>
                    {allCriteria.map((crit, i) => (
                      <th key={i} className="p-2 text-left font-semibold border-b border-blue-700 text-sm">{crit}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data.candidates || []).map((c, idx) => {
                    const fulfillment = getFulfillmentForCandidate(c);
                    return (
                      <tr key={idx} className="hover:bg-blue-50 transition even:bg-gray-50">
                        <td className="p-2 text-gray-800 font-medium border-b border-gray-200 text-sm">{c.candidate_name || "Unnamed Candidate"}</td>
                        {allCriteria.map((crit, i) => (
                          <td key={i} className="p-2 text-gray-700 border-b border-gray-200 text-sm">{fulfillment[crit]}</td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          {isVisible && (
  <div className="scroll-to-top-container">
    <button onClick={scrollToTop} className="scroll-to-top-btn">
      <ArrowUp size={24} />
    </button>
  </div>
)}
        </div>
      )}
    </div>
  );
}