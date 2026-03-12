import { useState, useRef } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { useLayerStore } from '../../store/layerStore';
import { fetchEsriServiceMetadata } from '../../lib/esriUtils';
import { EsriLayerPicker } from '../ESRI/EsriLayerPicker';
import { WmsLayerPicker } from '../WMS/WmsLayerPicker';
import { useToast } from '../UI/Toast';
import type { AnyLayer, EsriRestLayer, CogLayer, XyzLayer, WmsLayer, GeoJsonLayer } from '../../types/layers';
import { fromUrl } from 'geotiff';
import { XMLParser } from 'fast-xml-parser';

const TABS = ['ESRI REST', 'COG', 'XYZ Tiles', 'WMS', 'Vector'] as const;

// ── ESRI service presets – Nova Scotia NSGIWA MapServer catalogue ─────────────
const ESRI_PRESET_GROUPS: { group: string; items: { name: string; url: string }[] }[] = [
  {
    group: 'BASE – Base Mapping',
    items: [
      { name: 'Civic Address File (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NS_CivicAddress_File_UT83/MapServer' },
      { name: 'Civic Address File (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NS_CivicAddress_File_WM84/MapServer' },
      { name: 'GeoNames FO Points (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NS_GeoNAMES_FO_pnt_UT83/MapServer' },
      { name: 'GeoNames Points (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NS_GeoNAMES_pnt_UT83/MapServer' },
      { name: 'Map Index 50k (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_Indexes_50k_UT83/MapServer' },
      { name: 'Map Index 50k (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_Index_50k_WM84/MapServer' },
      { name: 'NS Streets (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NS_Streets_UT83/MapServer' },
      { name: 'NS Streets (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NS_Streets_WM84/MapServer' },
      { name: 'NSODB 2k (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSODB_2k_UT83/MapServer' },
      { name: 'NSODB 2k (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSODB_2k_WM84/MapServer' },
      { name: 'NSODB 10k (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSODB_10k_UT83/MapServer' },
      { name: 'NSODB 10k (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSODB_10k_WM84/MapServer' },
      { name: 'NSODB Index 10k (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_Index_NSODB_10k_WM84/MapServer' },
      { name: 'NSODB Indexes (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSODB_Indexes_UT83/MapServer' },
      { name: 'NSTDB Index 10k (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_Index_NSTDB_10k_WM84/MapServer' },
      { name: 'NSTDB Indexes (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_Indexes_UT83/MapServer' },
      { name: 'NSTDB 10k Buildings (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10k_Buildings_UT83/MapServer' },
      { name: 'NSTDB 10k Buildings (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10k_Buildings_WM84/MapServer' },
      { name: 'NSTDB 10k Colour (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10k_Colour_UT83/MapServer' },
      { name: 'NSTDB 10k Colour (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10k_Colour_WM84/MapServer' },
      { name: 'NSTDB 10k Colour No GeoNames (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10k_Colour_NoGeoNames_UT83/MapServer' },
      { name: 'NSTDB 10k Colour No GeoNames (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10k_Colour_NoGeoNames_WM84/MapServer' },
      { name: 'NSTDB 10k Delimiter Boundaries (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10K_Delimiter_Boundaries_UT83/MapServer' },
      { name: 'NSTDB 10k Delimiter Boundaries (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10K_Delimiter_Boundaries_WM84/MapServer' },
      { name: 'NSTDB 10k Delimiter Boundaries No Labels (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10K_Delimiter_Boundaries_NoLabels_UT83/MapServer' },
      { name: 'NSTDB 10k Delimiter Boundaries No Labels (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10K_Delimiter_Boundaries_NoLabels_WM84/MapServer' },
      { name: 'NSTDB 10k Delimiters (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10k_Delimiters_UT83/MapServer' },
      { name: 'NSTDB 10k Delimiters (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10k_Delimiters_WM84/MapServer' },
      { name: 'NSTDB 10k Designated Areas (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10k_Designated_Areas_UT83/MapServer' },
      { name: 'NSTDB 10k Designated Areas (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10k_Designated_Areas_WM84/MapServer' },
      { name: 'NSTDB 10k DTM (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10k_DTM_UT83/MapServer' },
      { name: 'NSTDB 10k DTM (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10k_DTM_WM84/MapServer' },
      { name: 'NSTDB 10k Grey (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10k_Grey_UT83/MapServer' },
      { name: 'NSTDB 10k Grey (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10k_Grey_WM84/MapServer' },
      { name: 'NSTDB 10k Grey No Roads Labels (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10k_Grey_NoRoadsLabels_UT83/MapServer' },
      { name: 'NSTDB 10k Grey No Roads Labels (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10k_Grey_NoRoadsLabels_WM84/MapServer' },
      { name: 'NSTDB 10k Grey With GeoName Labels (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10k_Grey_WithGeoNameLabels_UT83/MapServer' },
      { name: 'NSTDB 10k Grey With GeoName Labels (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10k_Grey_WithGeoNameLabels_WM84/MapServer' },
      { name: 'NSTDB 10k Grey With Roads (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10k_Grey_WithRoads_UT83/MapServer' },
      { name: 'NSTDB 10k Grey With Roads (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10k_Grey_WithRoads_WM84/MapServer' },
      { name: 'NSTDB 10k Land Cover (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10k_Land_Cover_UT83/MapServer' },
      { name: 'NSTDB 10k Land Cover (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10k_Land_Cover_WM84/MapServer' },
      { name: 'NSTDB 10k Landforms (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10k_Landforms_UT83/MapServer' },
      { name: 'NSTDB 10k Landforms v6 (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10k_Landforms_UT83v6/MapServer' },
      { name: 'NSTDB 10k Landforms (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10k_Landforms_WM84/MapServer' },
      { name: 'NSTDB 10k Roads (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10k_Roads_UT83/MapServer' },
      { name: 'NSTDB 10k Roads (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10k_Roads_WM84/MapServer' },
      { name: 'NSTDB 10k Structures (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10k_Structures_UT83/MapServer' },
      { name: 'NSTDB 10k Structures (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10k_Structures_WM84/MapServer' },
      { name: 'NSTDB 10k Utilities (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10k_Utilities_UT83/MapServer' },
      { name: 'NSTDB 10k Utilities (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10k_Utilities_WM84/MapServer' },
      { name: 'NSTDB 10k Water (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10k_Water_UT83/MapServer' },
      { name: 'NSTDB 10k Water (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10k_Water_WM84/MapServer' },
      { name: 'NSTDB 10k White With Water No Roads Labels (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_NSTDB_10k_White_WithWater_NoRoadsLabels_UT83/MapServer' },
      { name: 'Photo Centres (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_Photo_Centres_UT83/MapServer' },
      { name: 'Retired Map Service (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BASE/BASE_Retired_Mapservice_UT83/MapServer' },
    ],
  },
  {
    group: 'BIO – Wildlife & Landscape',
    items: [
      { name: 'Provincial Landscape Viewer (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BIO/WLD_ProvLandScapeViewer_UT83/MapServer' },
      { name: 'Provincial Landscape Viewer (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BIO/WLD_ProvLandScapeViewer_WM84/MapServer' },
    ],
  },
  {
    group: 'BND – Administrative Boundaries',
    items: [
      { name: 'Distribution of Seats (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BND/BND_DistributionOfSeats_UT83/MapServer' },
      { name: 'Electoral Boundaries (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BND/BND_ElectoralBoundaries_UT83/MapServer' },
      { name: 'Electoral District Profiles (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BND/BND_Electoral_District_Profiles_UT83/MapServer' },
      { name: 'General Election Results (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BND/BND_GeneralElectionResults_UT83/MapServer' },
      { name: 'Housing Authority Boundaries (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BND/BND_Housing_Authority_Boundaries_UT83/MapServer' },
      { name: 'Municipal & Village Boundaries (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BND/BND_Municipal_Village_Boundaries_UT83/MapServer' },
      { name: 'NS Community Boundaries (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BND/BND_NS_Community_Bndys_UT83/MapServer' },
      { name: 'NS Community Boundaries (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BND/BND_NS_Community_Bndys_WM84/MapServer' },
      { name: 'OSD Admin Boundaries (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BND/BND_OpportunitiesSocialDevelopment_Admin_Bndys_UT83/MapServer' },
      { name: 'Self-Contained Labour Areas 2021 (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/BND/BND_SelfcontainedLabourAreas_2021_UT83/MapServer' },
    ],
  },
  {
    group: 'ELEV – Elevation & Terrain',
    items: [
      { name: 'LiDAR Elevation (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/ELEV/ELEV_LIDAR_ELEVATION_UT83/MapServer' },
      { name: 'LiDAR Projects Hillshade (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/ELEV/ELEV_LIDAR_Projects_Hillshade_UT83/MapServer' },
      { name: 'NSTDB Elevation (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/ELEV/ELEV_NSTDB_Elevation_UT83/MapServer' },
    ],
  },
  {
    group: 'ENV – Environment & Protected Areas',
    items: [
      { name: 'NS Protected Area System (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/ENV/ENV_NS_Prot_Area_Sys_UT83/MapServer' },
      { name: 'Wilderness Areas & Nature Reserves (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/ENV/ENVWAandNRUT83V1/MapServer' },
      { name: 'Wilderness Areas & Nature Reserves (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/ENV/ENVWAandNRWM84V1/MapServer' },
    ],
  },
  {
    group: 'FOR – Forestry & Ecology',
    items: [
      { name: 'Ecodistrict 2015 (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/FOR/FOR_Ecodistrict_2015_UT83/MapServer' },
      { name: 'Ecodistrict 2015 (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/FOR/FOR_Ecodistrict_2015_WM84/MapServer' },
      { name: 'Eco Indicators 2023 (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/FOR/FOR_EcoIndicators_2023v1_UT83/MapServer' },
      { name: 'Eco Indicators 2023 (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/FOR/FOR_EcoIndicators_2023v1_WM84/MapServer' },
      { name: 'Ecological Land Classification 2015 (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/FOR/FOR_EcologicalLandClassification_2015_UT83/MapServer' },
      { name: 'Ecological Land Classification 2015 (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/FOR/FOR_EcologicalLandClassification_2015_WM84/MapServer' },
      { name: 'FEC Soil Type (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/FOR/FOR_FEC_SoilType_UT83/MapServer' },
      { name: 'FEC Soil Type (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/FOR/FOR_FEC_SoilType_WM84/MapServer' },
      { name: 'Forest (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/FOR/FOR_Forest_UT83/MapServer' },
      { name: 'Forest (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/FOR/FOR_Forest_WM84/MapServer' },
      { name: 'Forest Treatment (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/FOR/FOR_ForestTreatment_UT83/MapServer' },
      { name: 'Forest Treatment (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/FOR/FOR_ForestTreatment_WM84/MapServer' },
      { name: 'High Production Forest Planning (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/FOR/FOR_HighProductionForestPlanning_UT83/MapServer' },
      { name: 'High Production Forest Planning (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/FOR/FOR_HighProductionForestPlanning_WM84/MapServer' },
      { name: 'Old Growth Forest Policy (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/FOR/FOR_OldGrowthForestPolicy_UT83/MapServer' },
      { name: 'Old Growth Forest Policy (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/FOR/FOR_OldGrowthForestPolicy_WM84/MapServer' },
      { name: 'Provincial Landscape Viewer (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/FOR/FOR_ProvLandscapeViewer_UT83/MapServer' },
      { name: 'Provincial Landscape Viewer (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/FOR/FOR_ProvLandscapeViewer_WM84/MapServer' },
      { name: 'Research PSP (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/FOR/FOR_ResearchPSP_UT83/MapServer' },
      { name: 'Research PSP (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/FOR/FOR_ResearchPSP_WM84/MapServer' },
      { name: 'Road Index (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/FOR/FOR_RoadIndex_UT83/MapServer' },
      { name: 'Road Index (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/FOR/FOR_RoadIndex_WM84/MapServer' },
      { name: 'Tree Improvement (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/FOR/FOR_TreeImprovement_UT83/MapServer' },
      { name: 'Tree Improvement (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/FOR/FOR_TreeImprovement_WM84/MapServer' },
      { name: 'Wet Areas Mapping (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/FOR/FOR_WetAreasMapping_UT83/MapServer' },
      { name: 'Wet Areas Mapping (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/FOR/FOR_WetAreasMapping_WM84/MapServer' },
      { name: 'Wind Exposure 2017 (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/FOR/FOR_WindExposure2017_UT83/MapServer' },
      { name: 'Wind Exposure 2017 (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/FOR/FOR_WindExposure2017_WM84/MapServer' },
      { name: 'Wind Exposure 2017 PL (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/FOR/FOR_WindExposure2017_PL_UT83/MapServer' },
      { name: 'Wind Exposure 2017 PL (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/FOR/FOR_WindExposure2017_PL_WM84/MapServer' },
    ],
  },
  {
    group: 'GEOL – Geology & Hydrogeology',
    items: [
      { name: 'Arsenic Risk Water Wells (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/GEOL/GEOL_hg_ArsenicRiskWaterWells_h499ns_UT83/MapServer' },
      { name: 'Geoheritage Sites (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/GEOL/GEOL_gh_d477ns_Geoheritage_Sites_UT83/MapServer' },
      { name: 'Surficial Aquifers (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/GEOL/GEOL_hg_SurficialAquifers_h490ns_UT83/MapServer' },
    ],
  },
  {
    group: 'HLTH – Health Services',
    items: [
      { name: 'AED Map (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/HLTH/HLTH_AEDMap_UT83/MapServer' },
      { name: 'Community Clusters (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/HLTH/HLTH_CommunityClusters_UT83/MapServer' },
      { name: 'Community Health Networks (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/HLTH/HLTH_CommunityHealthNetworks_UT83/MapServer' },
      { name: 'Hospitals (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/HLTH/HLTH_Hospitals_UT83/MapServer' },
      { name: 'Long Term Care (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/HLTH/HLTH_LongTermCare_UT83/MapServer' },
      { name: 'Management Zones (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/HLTH/HLTH_ManagementZones_UT83/MapServer' },
    ],
  },
  {
    group: 'LOC – Survey Control',
    items: [
      { name: 'NSCRS Stations (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/LOC/LOC_NSCRS_Stations_UT83/MapServer' },
      { name: 'NSCRS Stations (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/LOC/LOC_NSCRS_Stations_WM84/MapServer' },
    ],
  },
  {
    group: 'OCN – Ocean & Coastal Flooding',
    items: [
      { name: 'High Water Coastline (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/OCN/OCN_High_Water_Coastline_UT83/MapServer' },
      { name: 'Projected Current Day Flooding (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/OCN/OCN_Projected_Current_Day_Flooding_UT83/MapServer' },
      { name: 'Projected Worst Case Flooding 2050 (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/OCN/OCN_Projected_Worst_Case_Flooding_2050_UT83/MapServer' },
      { name: 'Projected Worst Case Flooding 2100 (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/OCN/OCN_Projected_Worst_Case_Flooding_2100_UT83/MapServer' },
    ],
  },
  {
    group: 'PLAN – Crown Land & Planning',
    items: [
      { name: 'Crown Harvest Plans (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/PLAN/PLAN_CrownHarvestPlans_UT83/MapServer' },
      { name: 'Crown Harvest Plans (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/PLAN/PLAN_CrownHarvestPlans_WM84/MapServer' },
      { name: 'Crown Lands (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/PLAN/PLANCrownLandsWM84V1/MapServer' },
      { name: 'NSPRD Management Units (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/PLAN/PLAN_NSPRD_MU_UT83/MapServer' },
      { name: 'Simplified Crown Parcels (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/PLAN/PLAN_SimplifiedCrownParcels_UT83/MapServer' },
    ],
  },
  {
    group: 'SOC – Social & Population',
    items: [
      { name: 'Population Calculation (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/SOC/SOC_PopulationCalculation_UT83/MapServer' },
    ],
  },
  {
    group: 'STRU – Structures & Facilities',
    items: [
      { name: 'OSD Offices (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/STRU/STRU_OpportunitiesSocialDevelopment_Offices_UT83/MapServer' },
      { name: 'Schools (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/STRU/STRU_Schools_UT83/MapServer' },
    ],
  },
  {
    group: 'TRNS – Transportation',
    items: [
      { name: 'Highway 100 Markers (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/TRNS/TRNS_Highway_100_Markers_UT83/MapServer' },
      { name: 'NSRN Addressed Roads (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/TRNS/TRNS_NSRN_Addressed_Roads_UT83/MapServer' },
      { name: 'NSRN Addressed Roads (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/TRNS/TRNS_NSRN_Addressed_Roads_WM84/MapServer' },
      { name: 'NSRN Roads (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/TRNS/TRNS_NSRN_Roads_UT83/MapServer' },
      { name: 'NSRN Roads (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/TRNS/TRNS_NSRN_Roads_WM84/MapServer' },
      { name: 'TIR LOS (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/TRNS/TRNS_TIR_LOS_WM84/MapServer' },
      { name: 'TIR LOS Test (WGS84)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/TRNS/TRNS_TIR_LOS_WM84_Test/MapServer' },
    ],
  },
  {
    group: 'WTR – Water Resources',
    items: [
      { name: 'Flood Damage Reduction (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/WTR/WTR_FloodDamageReduction_UT83/MapServer' },
      { name: 'Municipal Water Supply Wellheads (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/WTR/WTR_MunicipalWaterSupplyWellheads_UT83/MapServer' },
      { name: 'NS Hydrographic Network (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/WTR/WTR_NSHN_UT83/MapServer' },
      { name: 'Public Registered Drinking Water Supplies (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/WTR/WTR_PublicRegisteredDrinkingWaterSupplies_UT83/MapServer' },
      { name: 'Watersheds (UTM83)', url: 'https://nsgiwa.novascotia.ca/arcgis/rest/services/WTR/WTR_Watersheds_UT83/MapServer' },
    ],
  },
];
type Tab = typeof TABS[number];

const PRESET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

function uid() { return `layer-${crypto.randomUUID().slice(0, 8)}`; }

interface Props {
  onClose: () => void;
}

export function AddLayerModal({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>('ESRI REST');
  const addLayer = useLayerStore((s) => s.addLayer);
  const layers = useLayerStore((s) => s.layers);
  const { showToast } = useToast();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Add Layer</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-slate-100 px-5 gap-0 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-2.5 px-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t ? 'border-accent text-accent' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === 'ESRI REST' && (
            <EsriTab
              onAdd={(layer) => { addLayer({ ...layer, order: layers.length }); showToast(`Added "${layer.name}"`, 'success'); onClose(); }}
            />
          )}
          {tab === 'COG' && (
            <CogTab
              onAdd={(layer) => { addLayer({ ...layer, order: layers.length }); showToast(`Added "${layer.name}"`, 'success'); onClose(); }}
            />
          )}
          {tab === 'XYZ Tiles' && (
            <XyzTab
              onAdd={(layer) => { addLayer({ ...layer, order: layers.length }); showToast(`Added "${layer.name}"`, 'success'); onClose(); }}
            />
          )}
          {tab === 'WMS' && (
            <WmsTab
              onAdd={(layer) => { addLayer({ ...layer, order: layers.length }); showToast(`Added "${layer.name}"`, 'success'); onClose(); }}
            />
          )}
          {tab === 'Vector' && (
            <VectorTab
              onAdd={(layer) => { addLayer({ ...layer, order: layers.length }); showToast(`Added "${layer.name}"`, 'success'); onClose(); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── ESRI Tab ────────────────────────────────────────────────────────────────

function EsriTab({ onAdd }: { onAdd: (l: AnyLayer) => void }) {
  const [url, setUrl] = useState('https://nsgiwa2.novascotia.ca/arcgis/rest/services/PLAN/PLAN_NSPRD_WM84/MapServer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState<Awaited<ReturnType<typeof fetchEsriServiceMetadata>> | null>(null);
  const [selectedLayers, setSelectedLayers] = useState<number[]>([]);
  const [isFeatureServer, setIsFeatureServer] = useState(false);
  const [presetFilter, setPresetFilter] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const handleFetch = async () => {
    setLoading(true); setError(''); setMeta(null);
    try {
      const data = await fetchEsriServiceMetadata(url);
      setMeta(data);
      const isFS = url.toLowerCase().includes('featureserver');
      setIsFeatureServer(isFS);
      setSelectedLayers(data.layers?.map((l) => l.id) ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (!meta) return;
    const layer: EsriRestLayer = {
      id: uid(),
      name: meta.mapName || url.split('/').at(-2) || 'ESRI Layer',
      type: isFeatureServer ? 'esri-featureserver' : 'esri-mapserver',
      visible: true,
      opacity: 1,
      order: 0,
      url,
      serviceMetadata: meta,
      visibleSubLayers: selectedLayers,
    };
    onAdd(layer);
  };

  const totalPresets = ESRI_PRESET_GROUPS.reduce((sum, g) => sum + g.items.length, 0);

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group); else next.add(group);
      return next;
    });
  };

  const filterLower = presetFilter.toLowerCase();
  const displayGroups = presetFilter
    ? [{ group: 'Search Results', items: ESRI_PRESET_GROUPS.flatMap((g) => g.items).filter((p) =>
        p.name.toLowerCase().includes(filterLower) || p.url.toLowerCase().includes(filterLower)
      )}]
    : ESRI_PRESET_GROUPS;

  return (
    <div className="space-y-4">
      {/* Presets */}
      <div>
        <button
          type="button"
          onClick={() => setShowPresets((v) => !v)}
          className="text-xs font-medium text-accent hover:underline flex items-center gap-1"
        >
          {showPresets ? '▾' : '▸'} Saved connections ({totalPresets})
        </button>
        {showPresets && (
          <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden">
            <input
              type="text"
              value={presetFilter}
              onChange={(e) => setPresetFilter(e.target.value)}
              placeholder="Filter connections…"
              className="w-full px-3 py-1.5 text-xs border-b border-slate-200 focus:outline-none"
            />
            <div className="max-h-64 overflow-y-auto">
              {displayGroups.map((g) => (
                <div key={g.group}>
                  {!presetFilter && (
                    <button
                      type="button"
                      onClick={() => toggleGroup(g.group)}
                      className="w-full text-left px-3 py-1.5 bg-slate-50 hover:bg-slate-100 flex items-center gap-1.5 border-b border-slate-200"
                    >
                      <span className="text-slate-400 text-xs">{expandedGroups.has(g.group) ? '▾' : '▸'}</span>
                      <span className="text-xs font-semibold text-slate-600 flex-1">{g.group}</span>
                      <span className="text-xs text-slate-400">{g.items.length}</span>
                    </button>
                  )}
                  {(presetFilter || expandedGroups.has(g.group)) && (
                    <ul className="divide-y divide-slate-100">
                      {g.items.map((p) => (
                        <li key={p.url}>
                          <button
                            type="button"
                            onClick={() => { setUrl(p.url); setMeta(null); setShowPresets(false); setPresetFilter(''); }}
                            className="w-full text-left px-3 py-1.5 hover:bg-slate-50 transition-colors"
                          >
                            <p className="text-xs font-medium text-slate-700 truncate">{p.name}</p>
                            <p className="text-xs text-slate-400 truncate">{p.url}</p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1">Service URL</label>
        <input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setMeta(null); }}
          placeholder="https://server/arcgis/rest/services/.../MapServer"
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-accent"
        />
        <p className="text-xs text-slate-400 mt-1">MapServer or FeatureServer URL</p>
      </div>
      <button
        type="button"
        onClick={handleFetch}
        disabled={loading || !url}
        className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        {loading ? 'Fetching…' : 'Fetch Service Info'}
      </button>
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      {meta && (
        <>
          {!isFeatureServer && meta.layers?.length > 0 && (
            <EsriLayerPicker metadata={meta} selected={selectedLayers} onChange={setSelectedLayers} />
          )}
          <button
            type="button"
            onClick={handleAdd}
            className="w-full py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover transition-colors"
          >
            Add Layer
          </button>
        </>
      )}
    </div>
  );
}

// ── COG Tab ─────────────────────────────────────────────────────────────────

function CogTab({ onAdd }: { onAdd: (l: AnyLayer) => void }) {
  const [url, setUrl] = useState('https://nswetlands-mapping.s3.us-east-2.amazonaws.com/COG/DTW_cog.tif');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState<{ width: number; height: number; bands: number } | null>(null);
  const [colorRamp, setColorRamp] = useState('terrain');
  const [minVal, setMinVal] = useState(0);
  const [maxVal, setMaxVal] = useState(10);

  const handleFetch = async () => {
    setLoading(true); setError(''); setInfo(null);
    try {
      const tiff = await fromUrl(url, { allowFullFile: false });
      const image = await tiff.getImage();
      setInfo({ width: image.getWidth(), height: image.getHeight(), bands: image.getSamplesPerPixel() });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    const layer: CogLayer = {
      id: uid(),
      name: url.split('/').pop()?.replace('.tif', '') || 'COG Layer',
      type: 'cog',
      visible: true,
      opacity: 1,
      order: 0,
      url,
      colorRamp,
      minValue: minVal,
      maxValue: maxVal,
      bandIndex: 0,
      gamma: 1,
      autoStretch: true,
    };
    onAdd(layer);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1">COG URL</label>
        <input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setInfo(null); }}
          placeholder="https://example.com/raster.tif"
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-accent"
        />
      </div>
      <button
        type="button"
        onClick={handleFetch}
        disabled={loading || !url}
        className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        {loading ? 'Reading…' : 'Read Metadata'}
      </button>
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      {info && (
        <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600 space-y-1">
          <p><span className="font-medium">Size:</span> {info.width} × {info.height} px</p>
          <p><span className="font-medium">Bands:</span> {info.bands}</p>
        </div>
      )}
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1">Color Ramp</label>
        <select
          value={colorRamp}
          onChange={(e) => setColorRamp(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-accent"
        >
          {['viridis','inferno','magma','plasma','blues','greens','reds','oranges','terrain','rdylgn','rdbu','greys'].map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-sm font-medium text-slate-700 block mb-1">Min Value</label>
          <input type="number" value={minVal} onChange={(e) => setMinVal(parseFloat(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-accent" />
        </div>
        <div className="flex-1">
          <label className="text-sm font-medium text-slate-700 block mb-1">Max Value</label>
          <input type="number" value={maxVal} onChange={(e) => setMaxVal(parseFloat(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-accent" />
        </div>
      </div>
      <button
        type="button"
        onClick={handleAdd}
        disabled={!url}
        className="w-full py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
      >
        Add COG Layer
      </button>
    </div>
  );
}

// ── XYZ Tab ──────────────────────────────────────────────────────────────────

function XyzTab({ onAdd }: { onAdd: (l: AnyLayer) => void }) {
  const [urlTemplate, setUrlTemplate] = useState('https://nswetlands-mapping.s3.us-east-2.amazonaws.com/BIGNEY/{z}/{x}/{y}.png');
  const [name, setName] = useState('');
  const [tileSize, setTileSize] = useState<256 | 512>(256);
  const [minZoom, setMinZoom] = useState(0);
  const [maxZoom, setMaxZoom] = useState(22);
  const [attribution, setAttribution] = useState('');

  const handleAdd = () => {
    const layer: XyzLayer = {
      id: uid(),
      name: name || urlTemplate.split('/').at(-4) || 'XYZ Layer',
      type: 'xyz',
      visible: true,
      opacity: 1,
      order: 0,
      urlTemplate,
      tileSize,
      minZoom,
      maxZoom,
      attribution,
    };
    onAdd(layer);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1">URL Template</label>
        <input
          type="url"
          value={urlTemplate}
          onChange={(e) => setUrlTemplate(e.target.value)}
          placeholder="https://example.com/{z}/{x}/{y}.png"
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-accent"
        />
        <p className="text-xs text-slate-400 mt-1">Include the full path prefix before {'{z}/{x}/{y}'}</p>
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1">Layer Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Auto-detected from URL"
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-accent"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Tile Size</label>
          <select
            value={tileSize}
            onChange={(e) => setTileSize(parseInt(e.target.value) as 256 | 512)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-accent"
          >
            <option value={256}>256 px</option>
            <option value={512}>512 px</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Attribution</label>
          <input
            type="text"
            value={attribution}
            onChange={(e) => setAttribution(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-accent"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Min Zoom</label>
          <input type="number" min={0} max={22} value={minZoom} onChange={(e) => setMinZoom(parseInt(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-accent" />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 block mb-1">Max Zoom</label>
          <input type="number" min={0} max={22} value={maxZoom} onChange={(e) => setMaxZoom(parseInt(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-accent" />
        </div>
      </div>
      <button
        type="button"
        onClick={handleAdd}
        disabled={!urlTemplate}
        className="w-full py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
      >
        Add XYZ Layer
      </button>
    </div>
  );
}

// ── WMS Tab ──────────────────────────────────────────────────────────────────

function WmsTab({ onAdd }: { onAdd: (l: AnyLayer) => void }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableLayers, setAvailableLayers] = useState<Array<{ name: string; title: string }>>([]);
  const [selectedLayers, setSelectedLayers] = useState<string[]>([]);
  const [version, setVersion] = useState<'1.1.1' | '1.3.0'>('1.1.1');

  const handleFetch = async () => {
    setLoading(true); setError(''); setAvailableLayers([]);
    try {
      const capUrl = `${url}?SERVICE=WMS&REQUEST=GetCapabilities`;
      const res = await fetch(capUrl);
      const xml = await res.text();
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
      const parsed = parser.parse(xml);
      const cap = parsed.WMT_MS_Capabilities || parsed.WMS_Capabilities;
      const cap130 = parsed['WMS_Capabilities'];
      if (cap130) setVersion('1.3.0');
      const layerNode = cap?.Capability?.Layer || cap130?.Capability?.Layer;
      const extractLayers = (node: Record<string, unknown>): Array<{ name: string; title: string }> => {
        const result: Array<{ name: string; title: string }> = [];
        if (node.Name && typeof node.Name === 'string') {
          result.push({ name: node.Name, title: String(node.Title || node.Name) });
        }
        if (node.Layer) {
          const children = Array.isArray(node.Layer) ? node.Layer : [node.Layer];
          for (const child of children) result.push(...extractLayers(child));
        }
        return result;
      };
      if (layerNode) setAvailableLayers(extractLayers(layerNode));
      else throw new Error('Could not parse WMS capabilities');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (!selectedLayers.length) return;
    const layer: WmsLayer = {
      id: uid(),
      name: selectedLayers.join(', '),
      type: 'wms',
      visible: true,
      opacity: 1,
      order: 0,
      url,
      layers: selectedLayers.join(','),
      version,
      format: 'image/png',
    };
    onAdd(layer);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1">WMS URL</label>
        <input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setAvailableLayers([]); }}
          placeholder="https://example.com/geoserver/wms"
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-accent"
        />
      </div>
      <button
        type="button"
        onClick={handleFetch}
        disabled={loading || !url}
        className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        {loading ? 'Fetching…' : 'Get Capabilities'}
      </button>
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      {availableLayers.length > 0 && (
        <>
          <WmsLayerPicker layers={availableLayers} selected={selectedLayers} onChange={setSelectedLayers} />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selectedLayers.length}
            className="w-full py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            Add WMS Layer{selectedLayers.length > 1 ? 's' : ''}
          </button>
        </>
      )}
    </div>
  );
}

// ── Vector Tab ───────────────────────────────────────────────────────────────

function VectorTab({ onAdd }: { onAdd: (l: AnyLayer) => void }) {
  const [subTab, setSubTab] = useState<'url' | 'file'>('url');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [colorIdx, setColorIdx] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUrlAdd = async () => {
    setLoading(true); setError('');
    try {
      let dataUrl = url;
      let data: GeoJsonLayer['data'] | undefined;
      if (url.toUpperCase().includes('SERVICE=WFS')) {
        const wfsUrl = url.includes('outputFormat') ? url : `${url}&outputFormat=application/json`;
        const res = await fetch(wfsUrl);
        data = await res.json();
      } else {
        const res = await fetch(url);
        data = await res.json();
        dataUrl = url;
      }
      const layer: GeoJsonLayer = {
        id: uid(),
        name: url.split('/').pop() || 'Vector Layer',
        type: 'geojson',
        source: 'url',
        url: dataUrl,
        data,
        visible: true,
        opacity: 1,
        order: 0,
        fillColor: PRESET_COLORS[colorIdx % PRESET_COLORS.length],
        strokeColor: '#1a2332',
        strokeWidth: 1,
        pointRadius: 6,
      };
      onAdd(layer);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true); setError('');

    if (file.size > 10 * 1024 * 1024) {
      // Show warning but continue
      alert('Warning: File exceeds 10MB. Performance may be affected.');
    }

    try {
      let data: GeoJsonLayer['data'];
      if (file.name.endsWith('.zip')) {
        const shpjs = (await import('shpjs')).default;
        const ab = await file.arrayBuffer();
        const result = await shpjs(ab);
        if (Array.isArray(result)) {
          // Multi-layer: pick first for now
          data = result[0] as GeoJsonLayer['data'];
        } else {
          data = result as GeoJsonLayer['data'];
        }
      } else {
        const text = await file.text();
        data = JSON.parse(text);
      }
      const layer: GeoJsonLayer = {
        id: uid(),
        name: file.name.replace(/\.(geojson|json|zip)$/, ''),
        type: 'geojson',
        source: file.name.endsWith('.zip') ? 'shapefile' : 'file',
        data,
        originalFileName: file.name,
        visible: true,
        opacity: 1,
        order: 0,
        fillColor: PRESET_COLORS[colorIdx % PRESET_COLORS.length],
        strokeColor: '#1a2332',
        strokeWidth: 1,
        pointRadius: 6,
      };
      onAdd(layer);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['url', 'file'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
              subTab === t ? 'bg-accent text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t === 'url' ? 'URL / WFS' : 'File Upload'}
          </button>
        ))}
      </div>

      <div>
        <label className="text-xs text-slate-500 block mb-1.5">Fill Color</label>
        <div className="flex gap-1.5 flex-wrap">
          {PRESET_COLORS.map((c, i) => (
            <button
              key={c}
              type="button"
              onClick={() => setColorIdx(i)}
              style={{ backgroundColor: c }}
              className={`w-6 h-6 rounded-full border-2 transition-all ${colorIdx === i ? 'border-slate-800 scale-110' : 'border-transparent'}`}
            />
          ))}
        </div>
      </div>

      {subTab === 'url' ? (
        <>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">GeoJSON / WFS URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/data.geojson"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-accent"
            />
          </div>
          <button
            type="button"
            onClick={handleUrlAdd}
            disabled={loading || !url}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? 'Loading…' : 'Add Vector Layer'}
          </button>
        </>
      ) : (
        <>
          <div
            className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center cursor-pointer hover:border-accent transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <p className="text-sm text-slate-500">Click to select a file</p>
            <p className="text-xs text-slate-400 mt-1">.geojson, .json, .zip (Shapefile)</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".geojson,.json,.zip"
            className="hidden"
            onChange={handleFileChange}
          />
          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={14} className="animate-spin" /> Processing file…
            </div>
          )}
        </>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
