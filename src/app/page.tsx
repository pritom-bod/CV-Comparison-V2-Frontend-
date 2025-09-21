"use client";

import { useState } from "react";
import { Upload, FileText, AlertCircle, ChevronRight, Menu, X } from "lucide-react";

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
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<JsonData | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setData(null);

    if (!tor) {
      setError("Please enter the Terms of Reference (ToR).");
      return;
    }
    if (!files || files.length === 0) {
      setError("Please upload at least one CV file.");
      return;
    }
    if (files.length > 10) {
      setError("Maximum 10 CVs allowed.");
      return;
    }

    const formData = new FormData();
    formData.append("tor", tor);
    for (let i = 0; i < files.length; i++) {
      formData.append("cvs", files[i]);
    }

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
      console.log("API Response:", json); // For debugging
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const getBadgeColor = (recommendation: string) => {
    if (recommendation === "Highly Suitable")
      return "bg-green-100 text-green-800 border-green-300";
    if (recommendation === "Suitable")
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-red-100 text-red-800 border-red-300";
  };

  // Map backend criteria to hierarchical structure
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

  // Sort comparison matrix by rank (ascending, rank 1 at top)
  const sortedMatrix = data?.comparison_matrix ? [...data.comparison_matrix].sort((a, b) => a.rank - b.rank) : [];

  // Get all unique criteria names
  const allCriteria = data?.criteria.map(c => c.criterion) || [];

  // Build fulfillment data for table
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

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 bg-white shadow-md z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
          <div className="flex items-center w-full">
        <div className="logo-container flex-shrink-0">
          <img
            src="/max.png"
            alt="Max Company Logo"
            className="h-6 sm:h-6 md:h-7 w-auto"
          />
        </div>
        <h1 className="flex-grow text-center text-xl sm:text-2xl font-bold">
          <span className="text-red-800">CV</span>{' '}
          <span className="text-blue-900">Comparison</span>{' '}
          <span className="text-gray-900">Tool</span>
        </h1>
      </div>
            
          </div>
          {isMenuOpen && (
            <div className="md:hidden bg-white border-t border-gray-200">
              <div className="flex flex-col space-y-2 py-4 px-4">
                <a
                  href="#"
                  className="text-gray-700 hover:text-blue-600 font-medium transition"
                >
                  Home
                </a>
                <a
                  href="#"
                  className="text-gray-700 hover:text-blue-600 font-medium transition"
                >
                  About
                </a>
                <a
                  href="#"
                  className="text-gray-700 hover:text-blue-600 font-medium transition"
                >
                  Contact
                </a>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto pt-20 pb-8 px-4 sm:px-6 lg:px-8">
        {/* Input Form */}
        <div className="form-container bg-white shadow-lg rounded-lg p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="form-label flex items-center gap-2 text-gray-700 font-medium text-lg">
                <FileText size={20} className="text-blue-500" />
                Terms of Reference (ToR)
              </label>
              <textarea
                value={tor}
                onChange={(e) => setTor(e.target.value)}
                rows={6}
                className="w-full mt-2 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="Enter the Terms of Reference here..."
                aria-describedby="tor-help"
              />
              <p id="tor-help" className="mt-1 text-sm text-gray-500">
                Provide a detailed description of the job requirements.
              </p>
            </div>
            <div>
              <label className="form-label flex items-center gap-2 text-gray-700 font-medium text-lg">
                <Upload size={20} className="text-blue-500" />
                Upload CVs (1–10 files, PDF/DOC/DOCX/TXT)
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                multiple
                onChange={(e) => setFiles(e.target.files)}
                className="block w-full mt-2 p-3 border border-gray-300 rounded-md file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition"
                aria-describedby="file-help"
              />
              <p id="file-help" className="mt-1 text-sm text-gray-500">
                Upload up to 10 CV files in PDF, DOC, DOCX, or TXT format.
              </p>
            </div>
            <div className="text-center">
              <button
                type="submit"
                disabled={loading}
                className="submit-button inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:bg-blue-400"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="#ffffff"
                        strokeWidth="4"
                        opacity="0.2"
                      />
                      <path
                        d="M4 12a8 8 0 018-8"
                        stroke="#ffffff"
                        strokeWidth="4"
                      />
                    </svg>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Analyze CVs
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {error && (
          <div
            className="error-message flex items-center gap-2 mt-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700"
            role="alert"
          >
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* Results */}
        {data && (
          <div className="space-y-10 mt-10">
            {/* ToR */}
            <section className="section bg-white shadow-md rounded-lg p-6">
              <h2 className="section-header flex items-center gap-2 text-2xl font-semibold text-gray-900">
                <span className="section-icon text-blue-600">📑</span>
                Terms of Reference
              </h2>
              <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md text-gray-800">
                {data.tor_text || "No ToR text provided."}
              </div>
            </section>

            {/* Evaluation Criteria */}
            <section className="section bg-white shadow-md rounded-lg p-6">
              <h2 className="section-header flex items-center gap-2 text-2xl font-semibold text-gray-900">
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
                      <div className="scores-category-header flex items-center gap-2 text-lg font-semibold text-gray-800">
                        <ChevronRight size={18} className="text-blue-500" />
                        {category.category} - {category.weight}
                      </div>
                      {category.subitems.map((subitem, subIdx) => (
                        <div
                          key={subIdx}
                          className="scores-subitem flex justify-between text-gray-700 mt-2"
                        >
                          <span>{subitem.name}</span>
                          <span>{subitem.weight}%</span>
                        </div>
                      ))}
                    </div>
                  ))}
                  <div className="scores-category">
                    <div className="scores-category-header flex items-center gap-2 text-lg font-semibold text-gray-800">
                      <ChevronRight size={18} className="text-blue-500" />
                      Total Score - 100%
                    </div>
                  </div>
                </div>
              </details>
            </section>

            {/* Candidates */}
            <section className="section bg-white shadow-md rounded-lg p-6">
              <h2 className="section-header flex items-center gap-2 text-2xl font-semibold text-gray-900">
                <span className="section-icon text-blue-600">👤</span>
                Candidates
              </h2>
              <div className="grid md:grid-cols-2 gap-6 mt-4">
                {(data.candidates || []).map((c, idx) => (
                  <div
                    key={idx}
                    className="candidate-card bg-gray-50 border border-gray-200 rounded-lg p-6 hover:shadow-lg transition"
                  >
                    <div className="candidate-header flex justify-between items-center">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {c.candidate_name || "Unnamed Candidate"}
                      </h3>
                      <span
                        className={`candidate-badge inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getBadgeColor(
                          c.recommendation || "Not Evaluated"
                        )}`}
                      >
                        {c.recommendation || "Not Evaluated"}
                      </span>
                    </div>
                    {/* <p className="candidate-score mt-2 text-gray-700">
                      <strong>Total Score:</strong>{" "}
                      {c.scores?.total_score != null ? c.scores.total_score.toFixed(2) : "N/A"} (100%)
                    </p> */}
                    <div className="space-y-3 mt-4">
                      <p className="strengths text-gray-700">
                        <strong>Strengths:</strong>{" "}
                        {c.summary_justification?.key_strengths || "None provided."}
                      </p>
                      <p className="weaknesses text-gray-700">
                        <strong>Weaknesses:</strong>{" "}
                        {c.summary_justification?.key_weaknesses || "None provided."}
                      </p>
                    </div>
                    <div className="scores-hierarchy mt-4 space-y-4">
                      <div className="scores-category">
                        <div className="scores-category-header flex items-center gap-2 text-lg font-semibold text-gray-800">
                          <ChevronRight size={18} className="text-blue-500" />
                          General Qualifications - 20%
                        </div>
                        <div className="scores-subitem flex justify-between text-gray-700 mt-2">
                          <span>Education</span>
                          <span>
                            {c.scores?.general_qualifications?.education != null
                              ? c.scores.general_qualifications.education.toFixed(2)
                              : "N/A"} (10%)
                          </span>
                        </div>
                        <div className="scores-subitem flex justify-between text-gray-700 mt-2">
                          <span>Years of Experience</span>
                          <span>
                            {c.scores?.general_qualifications?.years_of_experience != null
                              ? c.scores.general_qualifications.years_of_experience.toFixed(2)
                              : "N/A"} (10%)
                          </span>
                        </div>
                      </div>
                      <div className="scores-category">
                        <div className="scores-category-header flex items-center gap-2 text-lg font-semibold text-gray-800">
                          <ChevronRight size={18} className="text-blue-500" />
                          Adequacy for the Assignment - 50%
                        </div>
                        <div className="scores-subitem flex justify-between text-gray-700 mt-2">
                          <span>Relevant Project Experience</span>
                          <span>
                            {c.scores?.adequacy_for_assignment?.relevant_project_experience != null
                              ? c.scores.adequacy_for_assignment.relevant_project_experience.toFixed(2)
                              : "N/A"} (25%)
                          </span>
                        </div>
                        <div className="scores-subitem flex justify-between text-gray-700 mt-2">
                          <span>Donor Experience (WB, ADB, etc.)</span>
                          <span>
                            {c.scores?.adequacy_for_assignment?.donor_experience != null
                              ? c.scores.adequacy_for_assignment.donor_experience.toFixed(2)
                              : "N/A"} (15%)
                          </span>
                        </div>
                        <div className="scores-subitem flex justify-between text-gray-700 mt-2">
                          <span>Regional Experience</span>
                          <span>
                            {c.scores?.adequacy_for_assignment?.regional_experience != null
                              ? c.scores.adequacy_for_assignment.regional_experience.toFixed(2)
                              : "N/A"} (10%)
                          </span>
                        </div>
                      </div>
                      <div className="scores-category">
                        <div className="scores-category-header flex items-center gap-2 text-lg font-semibold text-gray-800">
                          <ChevronRight size={18} className="text-blue-500" />
                          Specific Skills & Competencies - 30%
                        </div>
                        <div className="scores-subitem flex justify-between text-gray-700 mt-2">
                          <span>Technical Skills</span>
                          <span>
                            {c.scores?.specific_skills_competencies?.technical_skills != null
                              ? c.scores.specific_skills_competencies.technical_skills.toFixed(2)
                              : "N/A"} (15%)
                          </span>
                        </div>
                        <div className="scores-subitem flex justify-between text-gray-700 mt-2">
                          <span>Language Proficiency</span>
                          <span>
                            {c.scores?.specific_skills_competencies?.language_proficiency != null
                              ? c.scores.specific_skills_competencies.language_proficiency.toFixed(2)
                              : "N/A"} (10%)
                          </span>
                        </div>
                        <div className="scores-subitem flex justify-between text-gray-700 mt-2">
                          <span>Certifications</span>
                          <span>
                            {c.scores?.specific_skills_competencies?.certifications != null
                              ? c.scores.specific_skills_competencies.certifications.toFixed(2)
                              : "N/A"} (5%)
                          </span>
                        </div>
                      </div>
                      <div className="scores-category">
                        {/* <div className="scores-category-header flex items-center gap-2 text-lg font-semibold text-gray-800">
                          <ChevronRight size={18} className="text-blue-500" />
                          Total Score - 100%
                        </div> */}
                        {/* <div className="scores-subitem flex justify-between text-gray-700 mt-2">
                          <span>Total</span>
                          <span>
                            {c.scores?.total_score != null
                              ? c.scores.total_score.toFixed(2)
                              : "N/A"} (100%)
                          </span>
                        </div> */}
                      </div>
                    </div>
                    <details className="details-section mt-4">
                      <summary className="cursor-pointer text-blue-600 font-medium hover:text-blue-800 transition">
                        Show Detailed Evaluation
                      </summary>
                      <div className="space-y-5 mt-4">
                        <h4 className="font-semibold text-gray-800 text-lg">
                          Detailed Evaluations
                        </h4>
                        {(c.detailed_evaluation || []).map((d, j) => (
                          <div
                            key={j}
                            className="evaluation-item p-4 bg-gray-50 border border-gray-200 rounded-md"
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
            <section className="section bg-white shadow-md rounded-lg p-6">
              <h2 className="section-header flex items-center gap-2 text-2xl font-semibold text-gray-900">
                <span className="section-icon text-blue-600">📋</span>
                Comparison Ranking
              </h2>
              <div className="table-container mt-4 overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-blue-50">
                      <th className="p-3 text-left text-gray-800 font-semibold border-b border-gray-200">
                        Name
                      </th>
                      {/* <th className="p-3 text-left text-gray-800 font-semibold border-b border-gray-200">
                        Score
                      </th> */}
                      <th className="p-3 text-left text-gray-800 font-semibold border-b border-gray-200">
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
                        <td className="p-3 text-gray-700 border-b border-gray-200">
                          {m.candidate_name || "Unnamed Candidate"}
                        </td>
                        {/* <td className="p-3 text-gray-700 border-b border-gray-200">
                          {m.total_score != null ? m.total_score.toFixed(2) : "N/A"}
                        </td> */}
                        <td className="p-3 text-gray-700 border-b border-gray-200">
                          {m.rank != null ? m.rank : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Final Recommendation */}
            <section className="section bg-white shadow-md rounded-lg p-6">
              <h2 className="section-header flex items-center gap-2 text-2xl font-semibold text-gray-900">
                <span className="section-icon text-blue-600">🏆</span>
                Final Recommendation
              </h2>
              <div className="recommendation-container mt-4 space-y-4">
                <p className="font-semibold text-lg text-gray-900">
                  Best Candidate: {data.final_recommendation?.best_candidate || "None"}
                </p>
                <p className="font-semibold text-lg text-gray-900">
                  Decision: {data.final_recommendation?.final_decision || "Not Evaluated"}
                </p>
                <div className="scores-hierarchy space-y-4">
                  {typeof data.final_recommendation?.justification === "string" ? (
                    <div className="scores-category">
                      <div className="scores-category-header flex items-center gap-2 text-lg font-semibold text-gray-800">
                        <ChevronRight size={18} className="text-blue-500" />
                        Justification
                      </div>
                      <div className="scores-subitem text-gray-700 mt-2">
                        <p>{data.final_recommendation.justification || "No justification provided."}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="scores-category">
                        <div className="scores-category-header flex items-center gap-2 text-lg font-semibold text-gray-800">
                          <ChevronRight size={18} className="text-blue-500" />
                          Detailed Explanation
                        </div>
                        <div className="scores-subitem text-gray-700 mt-2">
                          <p>{data.final_recommendation?.justification?.detailed_explanation || "No detailed explanation provided."}</p>
                        </div>
                      </div>
                      <div className="scores-category">
                        <div className="scores-category-header flex items-center gap-2 text-lg font-semibold text-gray-800">
                          <ChevronRight size={18} className="text-blue-500" />
                          Why Recommended Candidate
                        </div>
                        <div className="scores-subitem text-gray-700 mt-2">
                          <p>{data.final_recommendation?.justification?.why_he || "No reason provided for recommended candidate."}</p>
                        </div>
                      </div>
                      <div className="scores-category">
                        <div className="scores-category-header flex items-center gap-2 text-lg font-semibold text-gray-800">
                          <ChevronRight size={18} className="text-blue-500" />
                          Why Not Other Candidates
                        </div>
                        <div className="scores-subitem mt-2">
                          {(data.final_recommendation?.justification?.why_not_others || []).map((other, index) => (
                            <div key={index} className="text-gray-700 mb-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
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
            <section className="section bg-white shadow-md rounded-lg p-6">
              <h2 className="section-header flex items-center gap-2 text-2xl font-semibold text-gray-900">
                <span className="section-icon text-blue-600">📊</span>
                CV Comparison Table
              </h2>
              <div className="table-container mt-4 overflow-x-auto">
                <table className="w-full border-collapse bg-white shadow-sm rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      <th className="p-3 text-left font-semibold border-b border-blue-700">Candidate Name</th>
                      {allCriteria.map((crit, i) => (
                        <th key={i} className="p-3 text-left font-semibold border-b border-blue-700">{crit}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data.candidates || []).map((c, idx) => {
                      const fulfillment = getFulfillmentForCandidate(c);
                      return (
                        <tr key={idx} className="hover:bg-blue-50 transition even:bg-gray-50">
                          <td className="p-3 text-gray-800 font-medium border-b border-gray-200">{c.candidate_name || "Unnamed Candidate"}</td>
                          {allCriteria.map((crit, i) => (
                            <td key={i} className="p-3 text-gray-700 border-b border-gray-200">{fulfillment[crit]}</td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

          </div>
        )}
      </div>
    </div>
  );
}