{% comment %}
Section "Maintenance and participation" for the home page of a Twiin IG. Use in input/pagecontent/index.md:
  ### Maintenance and participation
  {% include twiin-maintenance.md %}
Links to chapter 6 (Governance) of Twiin Afsprakenstelsel 1.5.0. Update them when a later release moves these sections.
The feedback sentence uses input/data/twiin.yml (feedback.url, feedback.label), the same setting as the footer link; without it, it points to the feedback button on the TA page of the Afsprakenstelsel.
{% endcomment %}
{% assign afs = "https://afsprakenstelsel.twiin.nl/normatief/ta150/" %}
This implementation guide is maintained by Twiin. A version of it is normative only as far as a release of the Twiin Afsprakenstelsel refers to it.

The Twiin Bestuur decides on new releases of the Afsprakenstelsel, after advice from the Overlegtafel Twiin Deelnemers & Twiin Dienstverleners and the Overlegtafel GTK's ([Releasebeleid]({{afs}}6-4-releasebeleid), [Reglement]({{afs}}6-5-reglement); see [Governance]({{afs}}6-governance), Twiin Afsprakenstelsel 1.5.0).

Parties that want to take part in the development of the technical agreements (TA's) and of this guide can do so through the Twiin working group TA's (werkgroep TA's). To join, contact Twiin at [info@twiin.nl](mailto:info@twiin.nl).
{% if site.data.twiin.feedback.url %}
To propose a change to this guide, use [{% if site.data.twiin.feedback.label %}{{site.data.twiin.feedback.label}}{% else %}Propose a change{% endif %}]({{site.data.twiin.feedback.url}}).
{% else %}
To give feedback on this guide, use the feedback button on the page of the TA in the [Twiin Afsprakenstelsel](https://afsprakenstelsel.twiin.nl) that refers to this guide.
{% endif %}
