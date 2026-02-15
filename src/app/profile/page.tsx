"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { HelpTooltip } from "@/help";

type UserProfile = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  locale: string | null;
  ridingStyle: string | null;
  pacePreference: string | null;
  terrainPreference: string | null;
  experienceLevel: string | null;
  dailyDistanceKm: number | null;
  interests: string[] | null;
  avoidHighways: boolean;
  preferCamping: boolean;
  dietaryRestrictions: string | null;
  createdAt: string;
};

const RIDING_STYLES = ["TOURING", "ADVENTURE", "OFFROAD", "SPORT_TOURING"] as const;
const PACE_PREFERENCES = ["RELAXED", "MODERATE", "AGGRESSIVE"] as const;
const TERRAIN_PREFERENCES = ["PAVEMENT_ONLY", "MIXED", "OFFROAD_FOCUSED"] as const;
const EXPERIENCE_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"] as const;
const INTEREST_OPTIONS = [
  "scenicRoutes",
  "localCuisine",
  "historicSites",
  "photography",
  "camping",
  "twistyRoads",
  "wildlife",
  "beaches",
  "mountains",
  "deserts",
] as const;

export default function ProfilePage() {
  const t = useTranslations();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [ridingStyle, setRidingStyle] = useState<string | null>(null);
  const [pacePreference, setPacePreference] = useState<string | null>(null);
  const [terrainPreference, setTerrainPreference] = useState<string | null>(null);
  const [experienceLevel, setExperienceLevel] = useState<string | null>(null);
  const [dailyDistanceKm, setDailyDistanceKm] = useState<string>("");
  const [interests, setInterests] = useState<string[]>([]);
  const [avoidHighways, setAvoidHighways] = useState(false);
  const [preferCamping, setPreferCamping] = useState(false);
  const [dietaryRestrictions, setDietaryRestrictions] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const res = await fetch("/api/user/profile");
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/api/auth/signin?callbackUrl=/profile";
          return;
        }
        throw new Error("Failed to load profile");
      }
      const data: UserProfile = await res.json();
      setProfile(data);
      
      // Populate form
      setName(data.name ?? "");
      setRidingStyle(data.ridingStyle);
      setPacePreference(data.pacePreference);
      setTerrainPreference(data.terrainPreference);
      setExperienceLevel(data.experienceLevel);
      setDailyDistanceKm(data.dailyDistanceKm?.toString() ?? "");
      setInterests(data.interests ?? []);
      setAvoidHighways(data.avoidHighways);
      setPreferCamping(data.preferCamping);
      setDietaryRestrictions(data.dietaryRestrictions ?? "");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || null,
          ridingStyle,
          pacePreference,
          terrainPreference,
          experienceLevel,
          dailyDistanceKm: dailyDistanceKm ? parseInt(dailyDistanceKm, 10) : null,
          interests,
          avoidHighways,
          preferCamping,
          dietaryRestrictions: dietaryRestrictions || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      const updated = await res.json();
      setProfile(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function toggleInterest(interest: string) {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-slate-400" role="status" aria-live="polite">
          {t("common.loading")}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-red-400" role="alert">
          {error || "Unable to load profile"}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-100">
        {t("profile.title")}
        <HelpTooltip articleId="profile-preferences" />
      </h1>

      {/* User Info Header */}
      <div className="mb-8 flex items-center gap-4 rounded-lg border border-adv-border bg-slate-800/50 p-4">
        {profile.image && (
          <Image
            src={profile.image}
            alt={profile.name ?? "User"}
            width={64}
            height={64}
            className="rounded-full"
          />
        )}
        <div>
          <div className="text-lg font-semibold text-slate-100">
            {profile.name || t("profile.unnamed")}
          </div>
          <div className="text-sm text-slate-400">{profile.email}</div>
          <div className="text-xs text-slate-500">
            {t("profile.memberSince", {
              date: new Date(profile.createdAt).toLocaleDateString(),
            })}
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-4 rounded border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400"
        >
          {error}
        </div>
      )}
      {success && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 rounded border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-400"
        >
          {t("profile.saved")}
        </div>
      )}

      {/* Form Sections */}
      <div className="space-y-6">
        {/* Display Name */}
        <section className="rounded-lg border border-adv-border bg-slate-800/50 p-4">
          <label
            htmlFor="displayName"
            className="mb-3 block text-lg font-semibold text-slate-200"
          >
            {t("profile.displayName")}
          </label>
          <input
            id="displayName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("profile.namePlaceholder")}
            aria-describedby="displayNameHint"
            className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-adv-accent focus:outline-none focus:ring-2 focus:ring-adv-accent/50"
          />
        </section>

        {/* Riding Style */}
        <section
          className="rounded-lg border border-adv-border bg-slate-800/50 p-4"
          aria-labelledby="ridingStyleHeading"
        >
          <h2
            id="ridingStyleHeading"
            className="mb-3 text-lg font-semibold text-slate-200"
          >
            {t("profile.ridingStyle")}
          </h2>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="ridingStyleHeading">
            {RIDING_STYLES.map((style) => (
              <label
                key={style}
                className={`flex cursor-pointer items-center gap-2 rounded border p-3 transition focus-within:ring-2 focus-within:ring-adv-accent/50 ${
                  ridingStyle === style
                    ? "border-adv-accent bg-adv-accent/20 text-adv-accent"
                    : "border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500"
                }`}
              >
                <input
                  type="radio"
                  name="ridingStyle"
                  value={style}
                  checked={ridingStyle === style}
                  onChange={() => setRidingStyle(style)}
                  className="sr-only"
                />
                <span className="text-sm">{t(`profile.styles.${style}`)}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Experience Level */}
        <section className="rounded-lg border border-adv-border bg-slate-800/50 p-4">
          <label
            htmlFor="experienceLevel"
            className="mb-3 block text-lg font-semibold text-slate-200"
          >
            {t("profile.experienceLevel")}
          </label>
          <select
            id="experienceLevel"
            value={experienceLevel ?? ""}
            onChange={(e) => setExperienceLevel(e.target.value || null)}
            className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100 focus:border-adv-accent focus:outline-none focus:ring-2 focus:ring-adv-accent/50"
          >
            <option value="">{t("profile.selectExperience")}</option>
            {EXPERIENCE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {t(`profile.experience.${level}`)}
              </option>
            ))}
          </select>
        </section>

        {/* Pace & Terrain */}
        <section
          className="rounded-lg border border-adv-border bg-slate-800/50 p-4"
          aria-labelledby="paceTerrainHeading"
        >
          <h2 id="paceTerrainHeading" className="mb-3 text-lg font-semibold text-slate-200">
            {t("profile.paceAndTerrain")}
          </h2>
          
          <div className="mb-4">
            <span id="paceLabel" className="mb-2 block text-sm text-slate-400">
              {t("profile.pace")}
            </span>
            <div className="flex gap-2" role="group" aria-labelledby="paceLabel">
              {PACE_PREFERENCES.map((pace) => (
                <button
                  key={pace}
                  type="button"
                  onClick={() => setPacePreference(pace)}
                  aria-pressed={pacePreference === pace}
                  className={`flex-1 rounded border px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-adv-accent/50 ${
                    pacePreference === pace
                      ? "border-adv-accent bg-adv-accent/20 text-adv-accent"
                      : "border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  {t(`profile.paces.${pace}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <span id="terrainLabel" className="mb-2 block text-sm text-slate-400">
              {t("profile.terrain")}
            </span>
            <div className="flex gap-2" role="group" aria-labelledby="terrainLabel">
              {TERRAIN_PREFERENCES.map((terrain) => (
                <button
                  key={terrain}
                  type="button"
                  onClick={() => setTerrainPreference(terrain)}
                  aria-pressed={terrainPreference === terrain}
                  className={`flex-1 rounded border px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-adv-accent/50 ${
                    terrainPreference === terrain
                      ? "border-adv-accent bg-adv-accent/20 text-adv-accent"
                      : "border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  {t(`profile.terrains.${terrain}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="dailyDistance" className="mb-2 block text-sm text-slate-400">
              {t("profile.dailyDistance")}
            </label>
            <div className="flex items-center gap-2">
              <input
                id="dailyDistance"
                type="number"
                min="50"
                max="1000"
                step="50"
                value={dailyDistanceKm}
                onChange={(e) => setDailyDistanceKm(e.target.value)}
                placeholder="300"
                aria-describedby="dailyDistanceUnit"
                className="w-24 rounded border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100 focus:border-adv-accent focus:outline-none focus:ring-2 focus:ring-adv-accent/50"
              />
              <span id="dailyDistanceUnit" className="text-slate-400">km</span>
            </div>
          </div>
        </section>

        {/* Interests */}
        <section
          className="rounded-lg border border-adv-border bg-slate-800/50 p-4"
          aria-labelledby="interestsHeading"
        >
          <h2 id="interestsHeading" className="mb-3 text-lg font-semibold text-slate-200">
            {t("profile.interests")}
          </h2>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="interestsHeading">
            {INTEREST_OPTIONS.map((interest) => (
              <button
                key={interest}
                type="button"
                onClick={() => toggleInterest(interest)}
                aria-pressed={interests.includes(interest)}
                className={`rounded-full border px-3 py-1 text-sm transition focus:outline-none focus:ring-2 focus:ring-adv-accent/50 ${
                  interests.includes(interest)
                    ? "border-adv-accent bg-adv-accent/20 text-adv-accent"
                    : "border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500"
                }`}
              >
                {t(`profile.interestOptions.${interest}`)}
              </button>
            ))}
          </div>
        </section>

        {/* Preferences */}
        <fieldset className="rounded-lg border border-adv-border bg-slate-800/50 p-4">
          <legend className="mb-3 text-lg font-semibold text-slate-200">
            {t("profile.preferences")}
          </legend>
          <div className="space-y-3">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={avoidHighways}
                onChange={(e) => setAvoidHighways(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-adv-accent focus:ring-adv-accent focus:ring-2"
              />
              <span className="text-slate-300">{t("profile.avoidHighways")}</span>
            </label>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={preferCamping}
                onChange={(e) => setPreferCamping(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-adv-accent focus:ring-adv-accent focus:ring-2"
              />
              <span className="text-slate-300">{t("profile.preferCamping")}</span>
            </label>
          </div>
        </fieldset>

        {/* Dietary Restrictions */}
        <section className="rounded-lg border border-adv-border bg-slate-800/50 p-4">
          <label
            htmlFor="dietaryRestrictions"
            className="mb-3 block text-lg font-semibold text-slate-200"
          >
            {t("profile.dietary")}
          </label>
          <textarea
            id="dietaryRestrictions"
            value={dietaryRestrictions}
            onChange={(e) => setDietaryRestrictions(e.target.value)}
            placeholder={t("profile.dietaryPlaceholder")}
            rows={2}
            className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-adv-accent focus:outline-none focus:ring-2 focus:ring-adv-accent/50"
          />
        </section>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            aria-busy={saving}
            className="rounded bg-adv-accent px-6 py-2 font-semibold text-black transition hover:bg-adv-accentMuted focus:outline-none focus:ring-2 focus:ring-adv-accent focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50"
          >
            {saving ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
