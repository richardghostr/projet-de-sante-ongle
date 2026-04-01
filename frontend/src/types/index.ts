export type UploadResponse = {
  analysis_id?: string;
  id?: string;
  uuid?: string;
  data?: any;
};

export type AnalysisResult = {
  diagnostic?: string;
  conseils?: Array<{ texte_conseil?: string } | string>;
  result?: {
    pathologie?: string;
    score_confiance?: number;
    niveau_risque?: string;
    uuid?: string;
  };
};

export type TreatmentCreateResponse = {
  uuid?: string;
  data?: any;
};

export default {};
