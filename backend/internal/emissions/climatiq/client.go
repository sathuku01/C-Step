package climatiq

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
)

const baseURL = "https://api.climatiq.io"

type Client struct {
	apiKey     string
	httpClient *http.Client
}

func NewClient() (*Client, error) {
	apiKey := os.Getenv("CLIMATIQ_API_KEY")

	if apiKey == "" {
		return nil, fmt.Errorf("CLIMATIQ_API_KEY is not set")
	}

	return &Client{
		apiKey:     apiKey,
		httpClient: &http.Client{},
	}, nil
}

// --------------------
// SEARCH
// --------------------

type SearchResponse struct {
	CurrentPage  int              `json:"current_page"`
	LastPage     int              `json:"last_page"`
	TotalResults int              `json:"total_results"`
	Results      []ActivityResult `json:"results"`
}

type ActivityResult struct {
	ID                          string   `json:"id"`
	ActivityID                  string   `json:"activity_id"`
	Name                        string   `json:"name"`
	Sector                      string   `json:"sector"`
	Category                    string   `json:"category"`
	Source                      string   `json:"source"`
	SourceDataset               string   `json:"source_dataset"`
	SourceLink                  string   `json:"source_link"`
	SourceLCAActivity           string   `json:"source_lca_activity"`
	Year                        int      `json:"year"`
	YearReleased                int      `json:"year_released"`
	Region                      string   `json:"region"`
	RegionName                  string   `json:"region_name"`
	UnitType                    string   `json:"unit_type"`
	Unit                        string   `json:"unit"`
	SupportedCalculationMethods []string `json:"supported_calculation_methods"`
	Factor                      *float64 `json:"factor"`
	Description                 string   `json:"description"`
	Scopes                      []string `json:"scopes"`
	AccessType                  string   `json:"access_type"`
}

func (c *Client) Search(
	ctx context.Context,
	query string,
	dataVersion string,
	year int,
	resultsPerPage int,
) (*SearchResponse, error) {

	params := url.Values{}

	params.Set("query", query)
	params.Set("data_version", dataVersion)
	params.Set("year", fmt.Sprintf("%d", year))
	params.Set("results_per_page", fmt.Sprintf("%d", resultsPerPage))

	reqURL := fmt.Sprintf(
		"%s/data/v1/search?%s",
		baseURL,
		params.Encode(),
	)

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		reqURL,
		nil,
	)
	if err != nil {
		return nil, fmt.Errorf("create Climatiq search request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("call Climatiq search API: %w", err)
	}

	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf(
			"Climatiq search returned HTTP %d",
			resp.StatusCode,
		)
	}

	var result SearchResponse

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf(
			"decode Climatiq search response: %w",
			err,
		)
	}

	return &result, nil
}

// --------------------
// ESTIMATE
// --------------------

type EstimateRequest struct {
	EmissionFactor EmissionFactorSelector `json:"emission_factor"`
	Parameters     map[string]interface{} `json:"parameters"`
}

type EmissionFactorSelector struct {
	ActivityID  string `json:"activity_id"`
	DataVersion string `json:"data_version"`
	Region      string `json:"region,omitempty"`
	Year        int    `json:"year,omitempty"`
}

type EstimateResponse struct {
	CO2e                  float64 `json:"co2e"`
	CO2eUnit              string  `json:"co2e_unit"`
	CO2eCalculationMethod string  `json:"co2e_calculation_method"`
	CO2eCalculationOrigin string  `json:"co2e_calculation_origin"`

	EmissionFactor struct {
		Name              string   `json:"name"`
		ActivityID        string   `json:"activity_id"`
		ID                string   `json:"id"`
		AccessType        string   `json:"access_type"`
		Source            string   `json:"source"`
		SourceDataset     string   `json:"source_dataset"`
		Year              int      `json:"year"`
		Region            string   `json:"region"`
		Category          string   `json:"category"`
		SourceLCAActivity string   `json:"source_lca_activity"`
		DataQualityFlags  []string `json:"data_quality_flags"`
	} `json:"emission_factor"`

	ActivityData struct {
		ActivityValue float64 `json:"activity_value"`
		ActivityUnit  string  `json:"activity_unit"`
	} `json:"activity_data"`

	Notices []struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"notices"`
}

func (c *Client) Estimate(
	ctx context.Context,
	request EstimateRequest,
) (*EstimateResponse, error) {

	body, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("encode Climatiq estimate request: %w", err)
	}

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		baseURL+"/data/v1/estimate",
		bytes.NewReader(body),
	)
	if err != nil {
		return nil, fmt.Errorf("create Climatiq estimate request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("call Climatiq estimate API: %w", err)
	}

	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var apiError struct {
			ErrorCode string `json:"error_code"`
			Message   string `json:"message"`
		}

		if err := json.NewDecoder(resp.Body).Decode(&apiError); err == nil {
			return nil, fmt.Errorf(
				"Climatiq estimate returned HTTP %d: %s",
				resp.StatusCode,
				apiError.Message,
			)
		}

		return nil, fmt.Errorf(
			"Climatiq estimate returned HTTP %d",
			resp.StatusCode,
		)
	}

	var result EstimateResponse

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf(
			"decode Climatiq estimate response: %w",
			err,
		)
	}

	return &result, nil
}
