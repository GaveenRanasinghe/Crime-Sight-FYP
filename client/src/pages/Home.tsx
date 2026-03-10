import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, MapPin, TrendingUp, AlertCircle, Database, Zap } from "lucide-react";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const { data: summary, isLoading } = trpc.crime.getDashboardSummary.useQuery();

  const features = [
    {
      icon: <Database className="w-8 h-8 text-blue-600" />,
      title: "Data Analysis",
      description: "Comprehensive analysis of 2021-2023 crime statistics across 25 Sri Lankan districts with 13 crime categories.",
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-blue-600" />,
      title: "Interactive Dashboard",
      description: "Real-time visualizations with trends, distributions, and comparisons. Filter by year and crime type.",
    },
    {
      icon: <MapPin className="w-8 h-8 text-blue-600" />,
      title: "GIS Mapping",
      description: "Interactive map showing crime hotspots with color-coded intensity markers for each district.",
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-blue-600" />,
      title: "Predictive Analytics",
      description: "AI-powered forecasting using linear regression to predict future crime trends and identify high-risk areas.",
    },
    {
      icon: <AlertCircle className="w-8 h-8 text-blue-600" />,
      title: "Risk Assessment",
      description: "Automatic risk level classification (low, medium, high, critical) for each district based on trends.",
    },
    {
      icon: <Zap className="w-8 h-8 text-blue-600" />,
      title: "Export Reports",
      description: "Generate and export detailed reports with statistics, predictions, and visualizations.",
    },
  ];

  const stats = [
    { label: "Districts", value: "25" },
    { label: "Crime Categories", value: "13" },
    { label: "Years of Data", value: "3" },
    { label: "Total Crimes", value: isLoading ? "Loading..." : (summary?.totalCrimes ?? 0).toLocaleString() },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl font-bold mb-6">Sri Lanka Crime Prediction System</h1>
              <p className="text-xl text-blue-100 mb-8">
                Advanced analytics and predictive modeling for district level crime statistics. Leverage historical data to forecast trends and identify high risk areas.
              </p>
              <div className="flex gap-4">
                {isAuthenticated ? (
                  <>
                    <Button
                      asChild
                      size="lg"
                      className="bg-white text-blue-900 hover:bg-blue-50"
                    >
                      <a href="/dashboard">Go to Dashboard</a>
                    </Button>
                    <Button
                      asChild
                      size="lg"
                      variant="outline"
                      className="border-white text-white hover:bg-blue-800"
                    >
                      <a href="/map">View Crime Map</a>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      asChild
                      size="lg"
                      className="bg-white text-blue-900 hover:bg-blue-50"
                    >
                      <a href={getLoginUrl()}>Get Started</a>
                    </Button>
                    <Button
                      asChild
                      size="lg"
                      variant="outline"
                      className="border-white text-white hover:bg-blue-800"
                    >
                      <a href="/dashboard">View Crime Map</a>
                    </Button>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Powerful Features</h2>
          <p className="text-xl text-gray-600">Everything you need for comprehensive crime analysis and prediction</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <Card key={idx} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mb-4">{feature.icon}</div>
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Data Overview Section */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">Dataset Overview</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">25 Districts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Comprehensive coverage across all districts of Sri Lanka including urban, rural, and island regions.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">13 Crime Types</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Detailed categorization including violent crimes, property crimes, and sexual offenses.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">3 Years (2021-2023)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Longitudinal data enabling trend analysis and reliable predictive modeling.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{isLoading ? "..." : (summary?.totalCrimes ?? 0).toLocaleString()}</CardTitle>
                <CardDescription>Total Crimes Recorded</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Complete crime data across all districts and categories for comprehensive analysis.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle>Crime Categories Analyzed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  "Rape Cases",
                  "Homicide",
                  "Attempted Homicide",
                  "Abduction",
                  "Kidnapping",
                  "Arson",
                  "Theft over Rs. 50,000",
                  "Grievous Hurt",
                  "Hurt by Knife",
                  "Robbery",
                  "Extortion",
                  "Unnatural Offense",
                  "Sexual Abuse",
                ].map((crime, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span className="text-gray-700">{crime}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Explore Crime Patterns?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Access interactive dashboards, GIS maps, and predictive analytics to understand and forecast crime trends.
          </p>
          {isAuthenticated ? (
            <div className="flex gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-white text-blue-900 hover:bg-blue-50"
              >
                <a href="/dashboard">View Dashboard</a>
              </Button>
              <Button
                asChild
                size="lg"
                className="bg-white text-blue-900 hover:bg-blue-50"
              >
                <a href="/map">View Map</a>
              </Button>
            </div>
          ) : (
            <Button
              asChild
              size="lg"
              className="bg-white text-blue-900 hover:bg-blue-50"
            >
              <a href={getLoginUrl()}>Get Started Now</a>
            </Button>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-white font-semibold mb-4">Platform</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="/dashboard" className="hover:text-white">Dashboard</a></li>
                <li><a href="/map" className="hover:text-white">Crime Map</a></li>
                <li><a href="/predictions" className="hover:text-white">Predictions</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Data</h3>
              <ul className="space-y-2 text-sm">
                <li>25 Districts</li>
                <li>13 Crime Types</li>
                <li>2021-2023</li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Features</h3>
              <ul className="space-y-2 text-sm">
                <li>Analytics</li>
                <li>Predictions</li>
                <li>GIS Mapping</li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">About</h3>
              <p className="text-sm">
                Advanced crime analytics platform for Sri Lanka using machine learning and geospatial analysis.
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; 2026 Gaveen Ranasinghe. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
